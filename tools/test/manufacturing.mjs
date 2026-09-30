/**
 * The manufacturing console, end to end.
 *
 *     node --experimental-sqlite tools/test/manufacturing.mjs
 *
 * Same harness as the registry: the real Worker, real SQLite. The rules
 * checked are the ones a facility would be hurt by breaking:
 *
 *   - it sits behind the registry's gate, and a viewer reads but never writes;
 *   - a batch enters its frames into the registry and draws its stock in one
 *     step, and a batch that cannot be entered whole changes nothing at all;
 *   - stock moves only through the log, never by editing the count;
 *   - a batch moves forward one stage at a time and is not released untested;
 *   - an order is approved by an administrator other than whoever drafted it;
 *   - the metrics are computed from the records, including field returns.
 */
import { call, ok, group, report } from './harness.mjs';

const as = (code) => call('POST', '/api/registry/session', { code });
const mfg = (method, path, body) => call(method, '/api/registry/mfg' + path, body);

group('— the gate —');
let r = await call('GET', '/api/registry/mfg/batches', undefined, { anon: true });
ok('an anonymous read is refused', r.status === 401, r.status);

await as('readonly');
r = await mfg('GET', '/batches');
ok('a viewer reads batches', r.status === 200 && Array.isArray(r.body.batches), r.body);
r = await mfg('POST', '/materials', { sku: 'X-1', name: 'x' });
ok('a viewer cannot write', r.status === 403, r.body);

group('— materials —');
await as('admincode');
r = await mfg('POST', '/materials', { sku: 'cc-1', name: 'ClearCore controller', on_hand: 30, reorder_at: 24, per_leg: 1 });
ok('a material is added, part number normalised', r.status === 201 && r.body.sku === 'CC-1', r.body);
await mfg('POST', '/materials', { sku: 'BRK-U2', name: 'Rail bracket', on_hand: 100, reorder_at: 40, per_leg: 2 });
await mfg('POST', '/materials', { sku: 'GLOVE', name: 'Nitrile gloves', unit: 'box', on_hand: 10, reorder_at: 2 });

r = await mfg('POST', '/materials', { sku: 'CC-1', name: 'again' });
ok('a duplicate part number is refused', r.status === 409, r.body);

r = await mfg('PATCH', '/materials/CC-1', { on_hand: 999 });
ok('the count cannot be edited directly', r.status === 422, r.body);

r = await mfg('PATCH', '/materials/GLOVE', { name: 'Nitrile gloves, L', unit: 'box', reorder_at: 3, supplier: 'Uline' });
r = await mfg('GET', '/materials');
let glove = r.body.materials.find((m) => m.sku === 'GLOVE');
ok('a material is edited in place', glove.name === 'Nitrile gloves, L' && glove.reorder_at === 3 &&
   glove.supplier === 'Uline' && glove.on_hand === 10, glove);
await mfg('PATCH', '/materials/GLOVE', { supplier: '' });
r = await mfg('GET', '/materials');
glove = r.body.materials.find((m) => m.sku === 'GLOVE');
ok('clearing a field clears it', glove.supplier === null, glove.supplier);
r = await mfg('PATCH', '/materials/GLOVE', { name: '' });
ok('a material cannot lose its name', r.status === 422, r.body);
r = await mfg('PATCH', '/materials/NOPE', { name: 'x' });
ok('editing an unlisted part is a 404', r.status === 404, r.body);

group('— logging a batch —');
r = await mfg('POST', '/batches', {
  batch_number: 'b-2609-a', variant: 'LEG-S', first_serial: 'L-V3BE201', frame_count: 24, lots: 'EXT-114'
});
ok('a 24-frame batch is logged', r.status === 201 && r.body.last_serial === 'R-V3BE212', r.body);

r = await call('GET', '/api/registry/legs?q=V3BE2&limit=500');
const built = r.body.legs.filter((l) => l.batch === 'B-2609-A');
ok('its frames are in the registry, built, carrying the batch',
   built.length === 24 && built.every((l) => l.state === 'built'), built.length);
const serials = new Set(built.map((l) => l.mechanical_serial));
ok('frames pair into modules: L-201, R-201, L-202 ... R-212',
   ['L-V3BE201', 'R-V3BE201', 'L-V3BE202', 'R-V3BE212'].every((s) => serials.has(s)) && !serials.has('L-V3BE213'),
   [...serials].sort());

r = await mfg('GET', '/materials');
const stock = Object.fromEntries(r.body.materials.map((m) => [m.sku, m]));
ok('each frame drew its bill of materials', stock['CC-1'].on_hand === 6 && stock['BRK-U2'].on_hand === 52,
   { cc: stock['CC-1'].on_hand, brk: stock['BRK-U2'].on_hand });
ok('a part not on the leg BOM is untouched', stock.GLOVE.on_hand === 10, stock.GLOVE.on_hand);
ok('a part under its reorder point says so', stock['CC-1'].status === 'order', stock['CC-1'].status);
ok('days of cover follow from the draw', stock['CC-1'].days_of_cover === 8, stock['CC-1']);

r = await mfg('POST', '/batches', {
  batch_number: 'B-2609-B', variant: 'LEG-SH', first_serial: 'L-V3BE210', frame_count: 12
});
ok('a batch overlapping existing frames is refused', r.status === 409, r.body);
r = await mfg('GET', '/batches');
const after = await mfg('GET', '/materials');
ok('...and changed nothing: no batch, no stock drawn',
   r.body.batches.length === 1 && after.body.materials.find((m) => m.sku === 'CC-1').on_hand === 6);

r = await mfg('POST', '/batches', { batch_number: 'B-2609-A', variant: 'LEG-S', first_serial: 'L-V3BE000', frame_count: 1 });
ok('a batch number is used once', r.status === 409, r.body);
r = await mfg('POST', '/batches', { batch_number: 'B-X', variant: 'LEG-S', first_serial: '25014873', frame_count: 2 });
ok('an electronics serial cannot start a batch', r.status === 422, r.body);

group('— stages —');
r = await mfg('PATCH', '/batches/B-2609-A', { stage: 'commissioning' });
ok('a stage cannot be skipped', r.status === 422, r.body);
r = await mfg('PATCH', '/batches/B-2609-A', { stage: 'qa' });
ok('assembly moves to QA', r.status === 200 && r.body.batch.qa_at, r.body);
r = await mfg('PATCH', '/batches/B-2609-A', { qa_inspected: 24, qa_first_pass: 25 });
ok('more first-time passes than inspections is refused', r.status === 422, r.body);
r = await mfg('PATCH', '/batches/B-2609-A', { stage: 'commissioning' });
await mfg('PATCH', '/batches/B-2609-A', { stage: 'released' });
r = await mfg('GET', '/batches');
ok('a batch is not released without a QA result', r.body.batches[0].stage === 'commissioning', r.body.batches[0].stage);
r = await mfg('PATCH', '/batches/B-2609-A', { qa_inspected: 24, qa_first_pass: 22 });
ok('the QA result is recorded', r.status === 200 && r.body.batch.qa_first_pass === 22, r.body);
r = await mfg('PATCH', '/batches/B-2609-A', { stage: 'released' });
ok('then it releases', r.status === 200 && r.body.batch.released_at, r.body);
r = await mfg('PATCH', '/batches/B-2609-A', { stage: 'assembly' });
ok('and never goes back', r.status === 422, r.body);

group('— purchase orders —');
await as('opcode');
r = await mfg('POST', '/orders', { lines: [{ sku: 'CC-1', qty: 48 }, { sku: 'NOPE', qty: 1 }] });
ok('an order naming an unlisted part is refused whole', r.status === 422, r.body);
r = await mfg('POST', '/orders', { needed_by: '2026-10-15', lines: [{ sku: 'CC-1', qty: 48 }] });
const po = r.body.reference;
ok('an operator drafts an order', r.status === 201 && /^PO-\d{8}-/.test(po), r.body);
r = await mfg('POST', `/orders/${po}/approve`);
ok('an operator cannot approve it', r.status === 403, r.body);
r = await mfg('POST', `/orders/${po}/receive`);
ok('a draft cannot be received', r.status === 409, r.body);

await as('admincode');
r = await mfg('POST', '/orders', { lines: [{ sku: 'BRK-U2', qty: 60 }] });
const own = r.body.reference;
r = await mfg('POST', `/orders/${own}/approve`);
ok('an administrator cannot approve their own order', r.status === 403, r.body);

await as('leadcode');
r = await mfg('POST', `/orders/${po}/approve`);
ok('another administrator approves it', r.status === 200 && r.body.status === 'approved', r.body);
r = await mfg('POST', `/orders/${po}/receive`);
r = await mfg('GET', '/materials');
ok('receiving books the quantity onto the shelf', r.body.materials.find((m) => m.sku === 'CC-1').on_hand === 54);
r = await mfg('POST', `/orders/${po}/receive`);
ok('an order is received once', r.status === 409, r.body);

r = await mfg('POST', '/materials/GLOVE/moves', { reason: 'count', quantity: 7 });
ok('a stock count states what is on the shelf', r.status === 201 && r.body.on_hand === 7, r.body);

group('— time —');
await as('readonly');
r = await mfg('POST', '/time/clock-in', {});
ok('a viewer cannot clock in', r.status === 403, r.body);

await as('opcode');
r = await mfg('POST', '/time/clock-in', { batch_number: 'B-2609-A', activity: 'assembly' });
ok('an operator clocks in against a batch', r.status === 201, r.body);
r = await mfg('POST', '/time/clock-in', {});
ok('a second clock-in is refused', r.status === 409, r.body);
r = await mfg('GET', '/time');
ok('the week shows them on the clock', r.body.me.open && r.body.members.some((m) => m.member === 'op' && m.open), r.body);
r = await mfg('POST', '/time/clock-out');
ok('and clocks out', r.status === 200 && r.body.clocked_out, r.body);

r = await mfg('POST', '/time/entries', { member: 'op', member_name: 'Floor Operator',
  clock_in: new Date(Date.now() - 8 * 36e5).toISOString(), clock_out: new Date().toISOString() });
ok('an operator cannot enter time for others', r.status === 403, r.body);

await as('admincode');
const shift = { member: 'op', member_name: 'Floor Operator', batch_number: 'B-2609-A',
  clock_in: new Date(Date.now() - 10 * 36e5).toISOString(), clock_out: new Date(Date.now() - 2 * 36e5).toISOString() };
r = await mfg('POST', '/time/entries', { ...shift, clock_out: shift.clock_in });
ok('a stretch that ends before it starts is refused', r.status === 422, r.body);
r = await mfg('POST', '/time/entries', shift);
ok('an administrator enters a correction', r.status === 201, r.body);

group('— metrics —');
// Two of the batch's legs are commissioned; one comes back from the field.
for (const [mx, el] of [['L-V3BE201', '26000101'], ['L-V3BE202', '26000102']]) {
  await call('POST', `/api/registry/legs/${mx}/events`, { type: 'commissioned', electronics_serial: el });
}
await call('POST', '/api/registry/legs/L-V3BE202/events', { type: 'flag-raised', fault_code: 'DRV-40' });
await call('POST', '/api/registry/legs/L-V3BE202/events', { type: 'flag-raised', fault_code: 'DRV-41' });

r = await mfg('GET', '/metrics?days=90');
const m = r.body;
ok('first-pass yield is passed over inspected', m.first_pass_yield.value === 91.7, m.first_pass_yield);
ok('early-life failures count legs, not flags', m.early_life_failures.value === 50 &&
   m.early_life_failures.failed === 1, m.early_life_failures);
ok('cycle time comes from released batches', m.cycle_time.batches === 1 && m.cycle_time.value !== null, m.cycle_time);
ok('labour per unit is batch hours over frames', m.labour_per_unit.units === 24 &&
   m.labour_per_unit.value >= 0.3 && m.labour_per_unit.value <= 0.4, m.labour_per_unit);
// CC-1: 54 on hand at 0.8 a day = 68 d. BRK-U2: 52 at 1.6 a day = 33 d.
ok('days of cover names the tightest part', m.days_of_cover.sku === 'BRK-U2' && m.days_of_cover.value === 33, m.days_of_cover);
ok('the batch table carries yield and returns', m.by_batch[0].first_pass_yield === 91.7 &&
   m.by_batch[0].early_failures === 1, m.by_batch[0]);

report();
