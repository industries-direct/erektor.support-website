/**
 * The registry, end to end.
 *
 *     node --experimental-sqlite tools/test/registry.mjs
 *
 * Runs the real Worker against a real SQLite database. What is being checked
 * is not that the endpoints answer — it is the handful of rules the whole
 * design rests on, each of which is easy to break in a way nothing else would
 * catch:
 *
 *   - the section is shut to anyone without a session, and the API with it;
 *   - a frame is keyed on its mechanical serial, and an electronics swap
 *     rolls the binding over WITHOUT resetting wear or history;
 *   - only a closed service record resets the interval;
 *   - state moves only along the transitions data/lifecycle.json allows;
 *   - a field request lands on the leg it names, and is held rather than
 *     dropped when it names a leg the registry does not have.
 */
import { call, raw, clearCookie, ok, group, report } from './harness.mjs';

group('— the gate —');
let r = await call('GET', '/internal/', undefined, { anon: true });
ok('an anonymous /internal/ is redirected to sign-in', r.status === 302 &&
   r.headers.get('location').startsWith('/internal/signin.html?next='), r.status);

r = await call('GET', '/internal/signin.html', undefined, { anon: true });
ok('the sign-in page itself is served', r.status === 200);
ok('gated pages are not cached or indexed',
   r.headers.get('cache-control') === 'private, no-store' &&
   r.headers.get('x-robots-tag') === 'noindex, nofollow');

r = await call('GET', '/api/registry/legs', undefined, { anon: true });
ok('the API refuses an anonymous read', r.status === 401, r.body);

r = await call('POST', '/api/registry/session', { code: 'wrong' }, { anon: true });
ok('a wrong code is refused', r.status === 401, r.body);

r = await call('POST', '/api/registry/session', { code: 'admincode' });
ok('a good code opens a session', r.status === 200 && r.body.role === 'admin', r.body);

r = await call('GET', '/api/registry/legs');
ok('the session reads the fleet', r.status === 200 && r.body.total === 0, r.body);

group('— entering a work order —');
r = await call('POST', '/api/registry/legs', {
  legs: Array.from({ length: 4 }, (_, i) => ({
    mechanical_serial: 'MX-26-0010' + (i + 1), variant: 'LEG-S', batch: 'WO-2026-014', state: 'built'
  }))
});
ok('four frames enter as built', r.status === 201 && r.entered !== 0 && r.body.entered === 4, r.body);

r = await call('POST', '/api/registry/legs', { mechanical_serial: 'MX-26-00101', variant: 'LEG-S' });
ok('a duplicate mechanical serial is refused', r.status === 409, r.body);

r = await call('POST', '/api/registry/legs', { mechanical_serial: 'EL-25-014873', variant: 'LEG-S' });
ok('an electronics serial cannot be used as the key', r.status === 422, r.body);

r = await call('POST', '/api/registry/legs', {
  mechanical_serial: 'MX-26-00200', variant: 'LEG-S', state: 'pool'
});
ok('a frame with no ClearCore cannot enter the pool', r.status === 422 &&
   /no electronics serial/.test(r.body.problems.join(' ')), r.body);

group('— the state machine —');
r = await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'released' });
ok('built cannot jump straight to the pool', r.status === 422 &&
   /cannot go from "built" to "pool"/.test(r.body.problems.join(' ')), r.body);

r = await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'commissioned' });
ok('commissioning without a serial is refused', r.status === 422, r.body);

r = await call('POST', '/api/registry/legs/MX-26-00101/events',
  { type: 'commissioned', electronics_serial: 'EL-26-000501', controller: 'CC-1', firmware: '3.4.1' });
ok('commissioning binds the ClearCore', r.status === 201 &&
   r.body.leg.state === 'commissioned' && r.body.leg.electronics_serial === 'EL-26-000501', r.body.leg);

r = await call('POST', '/api/registry/legs/MX-26-00102/events',
  { type: 'commissioned', electronics_serial: 'EL-26-000501' });
ok('the same ClearCore cannot be bound twice', r.status === 422 &&
   /already bound to MX-26-00101/.test(r.body.problems.join(' ')), r.body);

await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'released' });
r = await call('POST', '/api/registry/legs/MX-26-00101/events',
  { type: 'assigned', holder: 'Cedar Rapids', motor_hours: 40 });
ok('assigning moves it into transit and records hours', r.status === 201 &&
   r.body.leg.state === 'transit' && r.body.leg.motor_hours === 40, r.body.leg);

r = await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'hours', motor_hours: 12 });
ok('motor-hours cannot fall', r.status === 422 && /cannot fall/.test(r.body.problems.join(' ')), r.body);

group('— identity survives an electronics swap —');
await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'delivered', holder: 'Cedar Rapids' });
await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'hours', motor_hours: 1300 });
r = await call('GET', '/api/registry/legs/MX-26-00101');
ok('1300 h with no closed record reads as due', r.body.leg.due === true, r.body.leg.hours_since_service);

await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'return-start' });
await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'check-in' });
r = await call('POST', '/api/registry/legs/MX-26-00101/events',
  { type: 'electronics-swap', electronics_serial: 'EL-26-000900' });
ok('the swap rolls the binding over', r.body.leg.electronics_serial === 'EL-26-000900', r.body.leg);
ok('...and does NOT reset the service interval', r.body.leg.due === true, r.body.leg.hours_since_service);

r = await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'divert' });
r = await call('POST', '/api/registry/legs/MX-26-00101/events', { type: 'service-closed', motor_hours: 1305 });
ok('a closed service record resets the interval', r.body.leg.due === false &&
   r.body.leg.hours_since_service === 0, r.body.leg);
ok('...and the frame keeps its lifetime hours', r.body.leg.motor_hours === 1305, r.body.leg.motor_hours);

r = await call('GET', '/api/registry/legs/MX-26-00101');
const types = r.body.events.map((e) => e.type);
ok('the history is append-only and complete', r.body.events.length === 11 &&
   types.includes('electronics-swap') && types.includes('service-closed'), types);
ok('the old binding is preserved on the old events',
   r.body.events.some((e) => e.electronics_serial === 'EL-26-000501'), 'lost the old serial');

group('— the field intake lands on the leg —');
r = await call('POST', '/api/requests', {
  _kind: 'flag', mechanical_serial: 'MX-26-00102', fault_code: 'DRV-21',
  reason: 'Drive current climbing', contact_name: 'Ops', facility: 'Cedar Rapids',
  contact_email: 'ops@example.com'
}, { anon: true });
ok('a public flag is accepted', r.status === 201, r.body);

r = await call('GET', '/api/registry/legs/MX-26-00102');
ok('...and shows on the leg as an open flag', r.body.leg.flag_code === 'DRV-21' &&
   r.body.events[0].type === 'flag-raised' && r.body.events[0].actor === 'portal', r.body.leg);

r = await call('POST', '/api/requests', {
  _kind: 'dispatch', electronics_serial: 'EL-99-999999', symptom: 'Will not drive',
  site_address: 'Somewhere', contact_name: 'Ops', facility: 'Elsewhere', contact_phone: '555'
}, { anon: true });
ok('a dispatch against an unknown leg still succeeds', r.status === 201, r.body);

r = await call('GET', '/api/registry/orphans');
ok('...and is held as unmatched rather than dropped',
   r.body.orphans.length === 1 && r.body.orphans[0].serial === 'EL-99-999999', r.body.orphans);

group('— summary and export —');
r = await call('GET', '/api/registry/summary');
ok('the summary counts the fleet', r.body.fleet === 4 && r.body.flagged === 1 &&
   r.body.unmatchedIntake === 1, r.body);

r = await call('GET', '/api/registry/legs?q=EL-26-000900');
ok('a leg is findable by its electronics serial', r.body.total === 1 &&
   r.body.legs[0].mechanical_serial === 'MX-26-00101', r.body.total);

r = await call('GET', '/api/registry/legs?flagged=1');
ok('the flagged filter works', r.body.total === 1, r.body.total);

r = await call('GET', '/api/registry/export');
ok('the CSV export has a header and a row per leg',
   typeof r.body === 'string' && r.body.split('\n').length === 5, r.body && r.body.slice(0, 40));

group('— roles —');
clearCookie();
await call('POST', '/api/registry/session', { code: 'readonly' });
r = await call('GET', '/api/registry/legs');
ok('a viewer reads', r.status === 200, r.status);
r = await call('POST', '/api/registry/legs', { mechanical_serial: 'MX-26-00900', variant: 'LEG-S' });
ok('a viewer cannot write', r.status === 403, r.body);
r = await call('DELETE', '/api/registry/legs/MX-26-00101');
ok('a viewer cannot delete', r.status === 403, r.body);

group('— forged and stale sessions —');
clearCookie();
r = await call('GET', '/api/registry/legs');
ok('no cookie is 401', r.status === 401, r.status);

const claims = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
r = await raw('GET', '/api/registry/legs',
  { cookie: 'ers_reg=' + claims({ sub: 'x', name: 'x', role: 'admin', exp: 2e9 }) + '.notasignature' });
ok('an unsigned cookie is refused', r.status === 401, r.body);

// A real signature over different claims: the body must be bound to the MAC.
r = await call('POST', '/api/registry/session', { code: 'readonly' });
const good = r.headers.get('set-cookie').split(';')[0].split('=')[1];
const tampered = claims({ sub: 'ro', name: 'Reader', role: 'admin', exp: 2e9 }) + '.' + good.split('.')[1];
r = await raw('POST', '/api/registry/legs', { cookie: 'ers_reg=' + tampered },
  { mechanical_serial: 'MX-26-00777', variant: 'LEG-S' });
ok('a viewer cannot promote itself by editing the cookie', r.status === 401, r.body);

r = await raw('POST', '/api/registry/legs',
  { cookie: 'ers_reg=' + good, origin: 'https://evil.example' },
  { mechanical_serial: 'MX-26-00778', variant: 'LEG-S' });
ok('a cross-site write is refused', r.status === 403, r.body);

group('— sign-in throttle —');
let last;
for (let i = 0; i < 10; i++) last = await call('POST', '/api/registry/session', { code: 'nope' }, { anon: true });
ok('repeated bad codes are throttled', last.status === 429, last.status);

report();
