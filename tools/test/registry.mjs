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
    mechanical_serial: 'L-V3BE10' + (i + 1), variant: 'LEG-S', batch: 'WO-2026-014', state: 'built'
  }))
});
ok('four frames enter as built', r.status === 201 && r.entered !== 0 && r.body.entered === 4, r.body);

r = await call('POST', '/api/registry/legs', { mechanical_serial: 'L-V3BE101', variant: 'LEG-S' });
ok('a duplicate mechanical serial is refused', r.status === 409, r.body);

r = await call('POST', '/api/registry/legs', { mechanical_serial: '25014873', variant: 'LEG-S' });
ok('an electronics serial cannot be used as the key', r.status === 422, r.body);

group('— serial formats —');
for (const [serial, why] of [['X-V3BE123', 'a side other than L or R'], ['L-V3BE12', 'a two-digit order number'],
                             ['L-V3BE1234', 'a four-digit order number'], ['L-3BE123', 'no version']]) {
  r = await call('POST', '/api/registry/legs', { mechanical_serial: serial, variant: 'LEG-S' });
  ok(`a leg serial with ${why} is refused`, r.status === 422, r.body);
}
r = await call('POST', '/api/registry/legs', {
  mechanical_serial: 'L-V3BE322', electronics_serial: '4294967296', variant: 'LEG-S'
});
ok('a controller number past 32 bits is refused', r.status === 422, r.body);

r = await call('POST', '/api/registry/legs', {
  mechanical_serial: 'L-V3BE200', variant: 'LEG-S', state: 'pool'
});
ok('a frame with no ClearCore cannot enter the pool', r.status === 422 &&
   /no electronics serial/.test(r.body.problems.join(' ')), r.body);

group('— the state machine —');
r = await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'released' });
ok('built cannot jump straight to the pool', r.status === 422 &&
   /cannot go from "built" to "pool"/.test(r.body.problems.join(' ')), r.body);

r = await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'commissioned' });
ok('commissioning without a serial is refused', r.status === 422, r.body);

r = await call('POST', '/api/registry/legs/L-V3BE101/events',
  { type: 'commissioned', electronics_serial: '26000501', controller: 'CC-1', firmware: '3.4.1' });
ok('commissioning binds the ClearCore', r.status === 201 &&
   r.body.leg.state === 'commissioned' && r.body.leg.electronics_serial === '26000501', r.body.leg);

r = await call('POST', '/api/registry/legs/L-V3BE102/events',
  { type: 'commissioned', electronics_serial: '26000501' });
ok('the same ClearCore cannot be bound twice', r.status === 422 &&
   /already bound to L-V3BE101/.test(r.body.problems.join(' ')), r.body);

await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'released' });
r = await call('POST', '/api/registry/legs/L-V3BE101/events',
  { type: 'assigned', holder: 'Cedar Rapids', motor_hours: 40 });
ok('assigning moves it into transit and records hours', r.status === 201 &&
   r.body.leg.state === 'transit' && r.body.leg.motor_hours === 40, r.body.leg);

r = await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'hours', motor_hours: 12 });
ok('motor-hours cannot fall', r.status === 422 && /cannot fall/.test(r.body.problems.join(' ')), r.body);

group('— identity survives an electronics swap —');
await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'delivered', holder: 'Cedar Rapids' });
await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'hours', motor_hours: 2600 });
r = await call('GET', '/api/registry/legs/L-V3BE101');
ok('2600 h with no closed record reads as due', r.body.leg.due === true, r.body.leg.hours_since_service);

await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'return-start' });
await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'check-in' });
r = await call('POST', '/api/registry/legs/L-V3BE101/events',
  { type: 'electronics-swap', electronics_serial: '26000900' });
ok('the swap rolls the binding over', r.body.leg.electronics_serial === '26000900', r.body.leg);
ok('...and does NOT reset the service interval', r.body.leg.due === true, r.body.leg.hours_since_service);

r = await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'divert' });
r = await call('POST', '/api/registry/legs/L-V3BE101/events', { type: 'service-closed', motor_hours: 2605 });
ok('a closed service record resets the interval', r.body.leg.due === false &&
   r.body.leg.hours_since_service === 0, r.body.leg);
ok('...and the frame keeps its lifetime hours', r.body.leg.motor_hours === 2605, r.body.leg.motor_hours);

r = await call('GET', '/api/registry/legs/L-V3BE101');
const types = r.body.events.map((e) => e.type);
ok('the history is append-only and complete', r.body.events.length === 11 &&
   types.includes('electronics-swap') && types.includes('service-closed'), types);
ok('the old binding is preserved on the old events',
   r.body.events.some((e) => e.electronics_serial === '26000501'), 'lost the old serial');

group('— the field intake lands on the leg —');
r = await call('POST', '/api/requests', {
  _kind: 'flag', mechanical_serial: 'L-V3BE102', fault_code: 'DRV-21',
  reason: 'Drive current climbing', contact_name: 'Ops', facility: 'Cedar Rapids',
  contact_email: 'ops@example.com'
}, { anon: true });
ok('a public flag is accepted', r.status === 201, r.body);

r = await call('GET', '/api/registry/legs/L-V3BE102');
ok('...and shows on the leg as an open flag', r.body.leg.flag_code === 'DRV-21' &&
   r.body.events[0].type === 'flag-raised' && r.body.events[0].actor === 'portal', r.body.leg);

r = await call('POST', '/api/requests', {
  _kind: 'dispatch', electronics_serial: '99999999', symptom: 'Will not drive',
  site_address: 'Somewhere', contact_name: 'Ops', facility: 'Elsewhere', contact_phone: '555'
}, { anon: true });
ok('a dispatch against an unknown leg still succeeds', r.status === 201, r.body);

r = await call('GET', '/api/registry/orphans');
ok('...and is held as unmatched rather than dropped',
   r.body.orphans.length === 1 && r.body.orphans[0].serial === '99999999', r.body.orphans);

group('— summary and export —');
r = await call('GET', '/api/registry/summary');
ok('the summary counts the fleet', r.body.fleet === 4 && r.body.flagged === 1 &&
   r.body.unmatchedIntake === 1, r.body);

r = await call('GET', '/api/registry/legs?q=26000900');
ok('a leg is findable by its electronics serial', r.body.total === 1 &&
   r.body.legs[0].mechanical_serial === 'L-V3BE101', r.body.total);

r = await call('GET', '/api/registry/legs?flagged=1');
ok('the flagged filter works', r.body.total === 1, r.body.total);

r = await call('GET', '/api/registry/export');
ok('the CSV export has a header and a row per leg',
   typeof r.body === 'string' && r.body.split('\n').length === 5, r.body && r.body.slice(0, 40));

group('— customer facility —');
r = await call('PATCH', '/api/registry/legs/L-V3BE101', { facility_id: '7' });
ok('a leg is assigned to a customer facility', r.status === 200 && r.body.leg.facility_id === 7, r.body);
r = await call('PATCH', '/api/registry/legs/L-V3BE101', { facility_id: 'plant 1' });
ok('a facility that is not an id is refused', r.status === 422, r.body);
r = await call('PATCH', '/api/registry/legs/L-V3BE101', { facility_id: '' });
ok('an empty facility unassigns the leg', r.status === 200 && r.body.leg.facility_id === null, r.body);

group('— roles —');
clearCookie();
await call('POST', '/api/registry/session', { code: 'readonly' });
r = await call('GET', '/api/registry/legs');
ok('a viewer reads', r.status === 200, r.status);
r = await call('POST', '/api/registry/legs', { mechanical_serial: 'L-V3BE900', variant: 'LEG-S' });
ok('a viewer cannot write', r.status === 403, r.body);
r = await call('DELETE', '/api/registry/legs/L-V3BE101');
ok('a viewer cannot delete', r.status === 403, r.body);

group('— the controller serial —');
await call('POST', '/api/registry/session', { code: 'admincode' });
const enter = (leg) => call('POST', '/api/registry/legs', { variant: 'LEG-S', ...leg });
const event = (mx, ev) => call('POST', `/api/registry/legs/${mx}/events`, ev);

r = await enter({ mechanical_serial: 'L-V3BE201', electronics_serial: '26001201', controller_serial: 'cc1-01201', controller: 'CC-1' });
ok('a leg enters with its controller serial', r.status === 201, r.body);
r = await call('GET', '/api/registry/legs/L-V3BE201');
ok('...stored upper-case, and on the commissioning event', r.body.leg.controller_serial === 'CC1-01201' &&
   r.body.events[0].controller_serial === 'CC1-01201', r.body);

r = await enter({ mechanical_serial: 'L-V3BE202', controller_serial: 'CC1-01202' });
ok('a controller serial with no ClearCore bound is refused', r.status === 422, r.body);
r = await enter({ mechanical_serial: 'L-V3BE202', electronics_serial: '26001202', controller_serial: 'CC1-1202' });
ok('a malformed controller serial is refused', r.status === 422, r.body);
r = await enter({ mechanical_serial: 'L-V3BE202', electronics_serial: '26001202', controller_serial: 'CC1-01202', controller: 'CC-0' });
ok('a CC1 serial on a CC-0 controller is refused', r.status === 422 && /CC-0/.test(r.body.problems.join(' ')), r.body);
r = await enter({ mechanical_serial: 'L-V3BE202', electronics_serial: '26001202', controller_serial: 'CC1-01201' });
ok('a controller serial already fitted elsewhere is refused', r.status === 409 &&
   /L-V3BE201/.test(r.body.problems.join(' ')), r.body);
r = await call('POST', '/api/registry/legs', { legs: [
  { mechanical_serial: 'L-V3BE202', variant: 'LEG-S', electronics_serial: '26001202', controller_serial: 'CC1-01299' },
  { mechanical_serial: 'R-V3BE202', variant: 'LEG-S', electronics_serial: '26001203', controller_serial: 'CC1-01299' }
] });
ok('the same controller serial twice in one batch is refused', r.status === 422, r.body);

r = await enter({ mechanical_serial: 'L-V3BE203', electronics_serial: '26001203', controller_serial: 'CC0-01203' });
r = await call('GET', '/api/registry/legs/L-V3BE203');
ok('with no controller given, the model is taken from the serial', r.body.leg.controller === 'CC-0', r.body.leg);

await enter({ mechanical_serial: 'L-V3BE204', state: 'built' });
r = await event('L-V3BE204', { type: 'controller-serial', controller_serial: 'CC1-01204' });
ok('a bare frame has no controller to record a serial for', r.status === 422, r.body);

await enter({ mechanical_serial: 'L-V3BE205', electronics_serial: '26001205', controller: 'CC-1' });
r = await event('L-V3BE205', { type: 'controller-serial' });
ok('recording a controller serial needs one', r.status === 422, r.body);
r = await event('L-V3BE205', { type: 'controller-serial', controller_serial: 'CC1-01201' });
ok('...and refuses one fitted to another leg', r.status === 422 && /L-V3BE201/.test(r.body.problems.join(' ')), r.body);
r = await event('L-V3BE205', { type: 'controller-serial', controller_serial: 'CC1-01205' });
ok('a stamp is recorded on a commissioned leg', r.status === 201 && r.body.leg.controller_serial === 'CC1-01205', r.body);
ok('...without touching the electronics binding or the state', r.body.leg.electronics_serial === '26001205' &&
   r.body.leg.state === 'commissioned', r.body.leg);

r = await event('L-V3BE201', { type: 'electronics-swap', electronics_serial: '26001290' });
ok('fitting a new ClearCore with no stamp clears the old one', r.status === 201 &&
   r.body.leg.controller_serial === null, r.body.leg);
ok('...while the old event keeps the old stamp',
   r.body.events.some((e) => e.type === 'commissioned' && e.controller_serial === 'CC1-01201'), r.body.events);
r = await event('L-V3BE205', { type: 'electronics-swap', electronics_serial: '26001291', controller_serial: 'CC1-01201' });
ok('the freed controller can be fitted to another leg', r.status === 201 &&
   r.body.leg.controller_serial === 'CC1-01201' && r.body.leg.electronics_serial === '26001291', r.body);
r = await event('L-V3BE205', { type: 'commissioned', electronics_serial: '26001291' });
ok('re-binding the same ClearCore keeps its stamp', r.body.leg && r.body.leg.controller_serial === 'CC1-01201', r.body);

r = await call('GET', '/api/registry/legs?q=CC1-0120');
ok('the search box finds a leg by controller serial',
   r.body.legs.some((l) => l.mechanical_serial === 'L-V3BE205'), r.body.legs.map((l) => l.mechanical_serial));

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
  { mechanical_serial: 'L-V3BE777', variant: 'LEG-S' });
ok('a viewer cannot promote itself by editing the cookie', r.status === 401, r.body);

r = await raw('POST', '/api/registry/legs',
  { cookie: 'ers_reg=' + good, origin: 'https://evil.example' },
  { mechanical_serial: 'L-V3BE778', variant: 'LEG-S' });
ok('a cross-site write is refused', r.status === 403, r.body);

group('— sign-in throttle —');
let last;
for (let i = 0; i < 10; i++) last = await call('POST', '/api/registry/session', { code: 'nope' }, { anon: true });
ok('repeated bad codes are throttled', last.status === 429, last.status);

report();
