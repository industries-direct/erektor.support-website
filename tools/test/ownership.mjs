/**
 * A customer sees only the legs it bought. A leg sold to someone else, or
 * still industries.direct's, never reaches its account, even while it sits
 * at one of its facilities.
 *
 *   node --experimental-sqlite tools/test/ownership.mjs
 */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { env, call, raw, ok, group, report, ROOT } from './harness.mjs';
import { makeD1 } from './d1.mjs';

env.ACCOUNTS = makeD1(join(ROOT, 'tools', 'test', 'accounts.sql'));
const sql = (text) => env.ACCOUNTS._raw.exec(text);
sql(`INSERT INTO companies (id, name) VALUES (1, 'Customer A'), (2, 'Customer B')`);
sql(`INSERT INTO facilities (id, company_id, name) VALUES (10, 1, 'A Plant'), (20, 2, 'B Plant')`);
sql(`INSERT INTO users (id, company_id, email, setup_completed_at) VALUES
       (1, 1, 'a@example.test', '2026-01-01'), (2, 2, 'b@example.test', '2026-01-01')`);
const session = (userId, token) => sql(
  `INSERT INTO sessions (token_hash, user_id, site, expires_at) VALUES
     ('${createHash('sha256').update(token).digest('hex')}', ${userId}, 'support', '2999-01-01T00:00:00Z')`);
session(1, 'token-a');
session(2, 'token-b');

const me = async (token) => (await raw('GET', '/api/account/me', { cookie: 'ers_portal=' + token })).body;
const serials = (body) => body.legs.map((l) => l.mechanical_serial).sort();

group('— staff set owners —');
let r = await call('POST', '/api/registry/session', { code: 'admincode' });
ok('admin signs in to the registry', r.status === 200, r.body);

const LEGS = {
  'L-V3BE301': { owner: 1, facility: 10 },     // A's leg at A's plant
  'L-V3BE302': { owner: 2, facility: 10 },     // B's leg at A's plant
  'L-V3BE303': { owner: null, facility: 10 },  // industries.direct's, at A's plant
  'L-V3BE304': { owner: 1, facility: 20 },     // A's leg at B's plant
  'L-V3BE305': { owner: 2, facility: 20 }      // B's leg at B's plant
};
for (const [serial, { owner, facility }] of Object.entries(LEGS)) {
  r = await call('POST', '/api/registry/legs', { mechanical_serial: serial, variant: 'LEG-S' });
  ok(`${serial} entered`, r.status === 201, r.body);
  r = await call('PATCH', '/api/registry/legs/' + serial, { facility_id: facility, owner_company_id: owner ?? '' });
  ok(`${serial} placed and owned`, r.status === 200 && r.body.leg.owner_company_id === owner, r.body);
}

r = await call('PATCH', '/api/registry/legs/L-V3BE301', { owner_company_id: 'Customer A' });
ok('an owner must be a company id', r.status === 422, r.body);

r = await call('GET', '/api/registry/companies');
ok('the registry lists customers to sell to', r.status === 200 && r.body.companies.length === 2, r.body);

group('— each customer sees only its own —');
const a = await me('token-a');
ok('A sees only its own leg at its own plant', JSON.stringify(serials(a)) === '["L-V3BE301"]', serials(a));
const aText = JSON.stringify(a);
ok("B's serial never reaches A, though it sits at A's plant", !aText.includes('L-V3BE302'));
ok("industries.direct's leg at A's plant never reaches A", !aText.includes('L-V3BE303'));

const b = await me('token-b');
ok('B sees only its own leg at its own plant', JSON.stringify(serials(b)) === '["L-V3BE305"]', serials(b));
ok("A's leg at B's plant never reaches B", !JSON.stringify(b).includes('L-V3BE304'));

r = await call('PATCH', '/api/registry/legs/L-V3BE303', { owner_company_id: 1 });
ok('selling a leg to A puts it on A', serials(await me('token-a')).includes('L-V3BE303'), r.body);
r = await call('PATCH', '/api/registry/legs/L-V3BE303', { owner_company_id: '' });
ok('taking it back to industries.direct removes it', !serials(await me('token-a')).includes('L-V3BE303'), r.body);

report();
