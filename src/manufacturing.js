/**
 * The manufacturing console: /api/registry/mfg/*
 *
 * Reached only through handleRegistry, which has already checked the session,
 * refused cross-site writes and refused writes from a viewer. What is left
 * here is the facility's own bookkeeping — batches, stock, purchase orders
 * and time — and the metrics that join it to the fleet record.
 *
 * Two rules carried over from the registry:
 *
 *   - A batch is entered whole or not at all. Its record, every frame it
 *     built and the stock those frames consumed go in one D1 batch, through
 *     the same validation as the registry's own intake (prepareLegs).
 *   - Stock is a projection of an append-only log. `materials.on_hand` only
 *     ever moves together with a `material_moves` row.
 */
import { SERIAL, EXAMPLE, normalise } from './serials.js';
import { isAdmin } from './auth.js';
import { prepareLegs } from './registry.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

const text = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s.slice(0, 2000);
};

const BATCH_NUMBER = /^[A-Z0-9][A-Z0-9-]{1,31}$/;
const SKU = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const MAX_FRAMES = 200;
const DAY = 864e5;

// Forward only. A batch that has to go back is a quality event on its legs,
// not a batch moving backwards.
const STAGES = ['assembly', 'qa', 'commissioning', 'released'];
const STAGE_STAMP = { qa: 'qa_at', commissioning: 'commissioning_at', released: 'released_at' };

const days = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY;
const round = (n, p = 1) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** p) / 10 ** p);
const hours = (e, now) => Math.max(0, ((e.clock_out ? Date.parse(e.clock_out) : now) - Date.parse(e.clock_in)) / 36e5);

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function reference(prefix) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = [...crypto.getRandomValues(new Uint8Array(3))]
    .map((b) => b.toString(36).toUpperCase().padStart(2, '0')).join('').slice(0, 4);
  return `${prefix}-${d}-${rand}`;
}

/**
 * L-V3BE123 + 3 → L-V3BE126: the manufacture order number counts up and the
 * side, version and product stay put. Null past order 999.
 */
function serialAt(first, offset) {
  const m = /^(.*?)(\d{3})$/.exec(first);
  const n = Number(m[2]) + offset;
  return n > 999 ? null : `${m[1]}${String(n).padStart(3, '0')}`;
}

/** An action (approve, clock out) carries no body; that is not malformed. */
async function body(request) {
  const raw = await request.text();
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch { return null; }
}

/* --------------------------------------------------------------- batches */

async function listBatches(env) {
  const rows = await env.REGISTRY.prepare(
    `SELECT b.*, (SELECT COUNT(*) FROM legs l WHERE l.batch = b.batch_number) AS legs_entered
       FROM batches b ORDER BY b.started_at DESC LIMIT 200`
  ).all();
  return { batches: rows.results };
}

async function createBatch(env, doc, input, actor) {
  const number = normalise(input.batch_number);
  const first = normalise(input.first_serial);
  const count = Number(input.frame_count);
  const variant = text(input.variant);
  const problems = [];
  if (!BATCH_NUMBER.test(number)) problems.push('A batch number is letters, digits and dashes, like B-2609-A.');
  if (!variant) problems.push('A batch needs a variant.');
  if (!SERIAL.mechanical.test(first)) problems.push(`${first || 'The first serial'} is not a leg serial (${EXAMPLE.mechanical}).`);
  if (!Number.isInteger(count) || count < 1 || count > MAX_FRAMES) {
    problems.push(`A batch is 1 to ${MAX_FRAMES} frames.`);
  }
  if (!problems.length && !serialAt(first, count - 1)) problems.push('That range runs past manufacture order 999.');
  if (problems.length) return json({ error: 'Nothing was logged.', problems }, 422);

  if (await env.REGISTRY.prepare('SELECT 1 FROM batches WHERE batch_number = ?').bind(number).first()) {
    return json({ error: 'Nothing was logged.', problems: [`${number} is already logged.`] }, 409);
  }

  const legs = Array.from({ length: count }, (_, i) => ({
    mechanical_serial: serialAt(first, i), variant, batch: number, state: 'built'
  }));
  const entered = await prepareLegs(env, doc, legs, actor);
  if (entered.error) return json(entered.error, entered.status);

  const now = new Date().toISOString();
  const statements = [
    env.REGISTRY.prepare(
      `INSERT INTO batches (batch_number, variant, first_serial, frame_count, stage, lots,
                            started_at, created_by, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'assembly', ?, ?, ?, ?, ?, ?)`
    ).bind(number, variant, first, count, text(input.lots), now, actor, text(input.notes), now, now),
    ...entered.statements
  ];

  // Every frame draws its bill of materials. Stock can go negative: that is a
  // count that was wrong, and hiding it would make it wrong twice.
  const bom = await env.REGISTRY.prepare('SELECT sku, per_leg FROM materials WHERE per_leg > 0').all();
  for (const m of bom.results) {
    const used = m.per_leg * count;
    statements.push(
      env.REGISTRY.prepare(
        `INSERT INTO material_moves (sku, at, delta, reason, reference, actor) VALUES (?, ?, ?, 'used', ?, ?)`
      ).bind(m.sku, now, -used, number, actor),
      env.REGISTRY.prepare('UPDATE materials SET on_hand = on_hand - ?, updated_at = ? WHERE sku = ?')
        .bind(used, now, m.sku)
    );
  }

  await env.REGISTRY.batch(statements);
  return json({
    batch_number: number,
    serials: entered.serials,
    last_serial: entered.serials[entered.serials.length - 1],
    materials_drawn: bom.results.length
  }, 201);
}

async function updateBatch(env, number, input) {
  const b = await env.REGISTRY.prepare('SELECT * FROM batches WHERE batch_number = ?').bind(number).first();
  if (!b) return json({ error: `No batch ${number}.` }, 404);

  const now = new Date().toISOString();
  const set = {};
  const problems = [];

  if (input.stage !== undefined && input.stage !== b.stage) {
    const from = STAGES.indexOf(b.stage);
    const to = STAGES.indexOf(input.stage);
    if (to === -1) problems.push(`Unknown stage "${input.stage}".`);
    else if (to !== from + 1) {
      problems.push(`${number} is in ${b.stage}; the next stage is ${STAGES[from + 1] || 'none — it is released'}.`);
    } else {
      set.stage = input.stage;
      set[STAGE_STAMP[input.stage]] = now;
    }
  }

  const inspected = input.qa_inspected !== undefined ? Number(input.qa_inspected) : b.qa_inspected;
  const passed = input.qa_first_pass !== undefined ? Number(input.qa_first_pass) : b.qa_first_pass;
  if (input.qa_inspected !== undefined || input.qa_first_pass !== undefined) {
    if (!Number.isInteger(inspected) || inspected < 0 || inspected > b.frame_count) {
      problems.push(`Frames inspected is 0 to ${b.frame_count}.`);
    } else if (!Number.isInteger(passed) || passed < 0 || passed > inspected) {
      problems.push('Passed first time cannot exceed frames inspected.');
    } else {
      set.qa_inspected = inspected;
      set.qa_first_pass = passed;
    }
  }
  // Releasing without a QA result would leave a hole in first-pass yield
  // that nobody notices until the quarter's numbers look better than they were.
  if (set.stage === 'released' && (set.qa_inspected ?? b.qa_inspected) == null) {
    problems.push('Record the QA result before releasing the batch.');
  }

  if (input.lots !== undefined) set.lots = text(input.lots);
  if (input.notes !== undefined) set.notes = text(input.notes);

  if (problems.length) return json({ error: 'Nothing was changed.', problems }, 422);
  if (!Object.keys(set).length) return json({ error: 'Nothing to change.' }, 422);

  set.updated_at = now;
  const keys = Object.keys(set);
  await env.REGISTRY.prepare(`UPDATE batches SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE batch_number = ?`)
    .bind(...keys.map((k) => set[k]), number).run();
  return json({ batch: await env.REGISTRY.prepare('SELECT * FROM batches WHERE batch_number = ?').bind(number).first() });
}

/* ------------------------------------------------------------- materials */

/** Daily draw over the last 30 days, and how long the shelf lasts at it. */
async function listMaterials(env) {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [rows, usage] = await env.REGISTRY.batch([
    env.REGISTRY.prepare('SELECT * FROM materials ORDER BY sku'),
    env.REGISTRY.prepare(
      `SELECT sku, -SUM(delta) AS used FROM material_moves WHERE reason = 'used' AND at >= ? GROUP BY sku`
    ).bind(since)
  ]);
  const used = Object.fromEntries(usage.results.map((u) => [u.sku, u.used]));
  return {
    materials: rows.results.map((m) => {
      const perDay = (used[m.sku] || 0) / 30;
      return {
        ...m,
        per_day: round(perDay, 2),
        days_of_cover: perDay > 0 ? round(Math.max(m.on_hand, 0) / perDay, 0) : null,
        status: m.on_hand < m.reorder_at ? 'order' : m.on_hand === m.reorder_at ? 'at' : 'stocked'
      };
    })
  };
}

function checkMaterial(input, isNew) {
  const problems = [];
  const out = {};
  if (isNew) {
    out.sku = normalise(input.sku);
    if (!SKU.test(out.sku)) problems.push('A part number is letters, digits, dots and dashes, like BRK-U2.');
    out.name = text(input.name);
    if (!out.name) problems.push('A material needs a name.');
  } else if (input.name !== undefined) {
    out.name = text(input.name);
    if (!out.name) problems.push('A material needs a name.');
  }
  for (const k of ['reorder_at', 'per_leg']) {
    if (input[k] === undefined || input[k] === '') continue;
    const n = Number(input[k]);
    if (!Number.isFinite(n) || n < 0) problems.push(`${k === 'per_leg' ? 'Per leg' : 'Reorder point'} must be a number, 0 or more.`);
    else out[k] = n;
  }
  if (input.unit !== undefined) out.unit = text(input.unit) || 'each';
  if (input.supplier !== undefined) out.supplier = text(input.supplier);
  return { out, problems };
}

async function createMaterial(env, input, actor) {
  const { out, problems } = checkMaterial(input, true);
  const start = input.on_hand === undefined || input.on_hand === '' ? 0 : Number(input.on_hand);
  if (!Number.isFinite(start) || start < 0) problems.push('Opening stock must be a number, 0 or more.');
  if (problems.length) return json({ error: 'Nothing was added.', problems }, 422);
  if (await env.REGISTRY.prepare('SELECT 1 FROM materials WHERE sku = ?').bind(out.sku).first()) {
    return json({ error: 'Nothing was added.', problems: [`${out.sku} is already listed.`] }, 409);
  }
  const now = new Date().toISOString();
  const statements = [
    env.REGISTRY.prepare(
      `INSERT INTO materials (sku, name, unit, on_hand, reorder_at, per_leg, supplier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(out.sku, out.name, out.unit || 'each', start, out.reorder_at || 0, out.per_leg || 0,
           out.supplier || null, now, now)
  ];
  if (start) {
    statements.push(env.REGISTRY.prepare(
      `INSERT INTO material_moves (sku, at, delta, reason, reference, actor) VALUES (?, ?, ?, 'count', 'opening stock', ?)`
    ).bind(out.sku, now, start, actor));
  }
  await env.REGISTRY.batch(statements);
  return json({ sku: out.sku }, 201);
}

async function updateMaterial(env, sku, input) {
  if (input.on_hand !== undefined) {
    return json({ error: 'Stock moves by recording a delivery, a use or a count — not by editing.' }, 422);
  }
  const { out, problems } = checkMaterial(input, false);
  if (problems.length) return json({ error: 'Nothing was changed.', problems }, 422);
  if (!Object.keys(out).length) return json({ error: 'Nothing to change.' }, 422);
  if (!await env.REGISTRY.prepare('SELECT 1 FROM materials WHERE sku = ?').bind(sku).first()) {
    return json({ error: `No material ${sku}.` }, 404);
  }
  out.updated_at = new Date().toISOString();
  const keys = Object.keys(out);
  await env.REGISTRY.prepare(`UPDATE materials SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE sku = ?`)
    .bind(...keys.map((k) => out[k]), sku).run();
  return json({ sku });
}

/** received / used add or take a quantity; count states what is on the shelf. */
async function recordMove(env, sku, input, actor) {
  const m = await env.REGISTRY.prepare('SELECT * FROM materials WHERE sku = ?').bind(sku).first();
  if (!m) return json({ error: `No material ${sku}.` }, 404);
  const qty = Number(input.quantity);
  const reason = input.reason;
  if (!['received', 'used', 'count'].includes(reason)) {
    return json({ error: 'A stock move is received, used or count.' }, 422);
  }
  if (!Number.isFinite(qty) || qty < 0 || (reason !== 'count' && qty === 0)) {
    return json({ error: 'Quantity must be a positive number.' }, 422);
  }
  const delta = reason === 'received' ? qty : reason === 'used' ? -qty : qty - m.on_hand;
  const now = new Date().toISOString();
  await env.REGISTRY.batch([
    env.REGISTRY.prepare(
      'INSERT INTO material_moves (sku, at, delta, reason, reference, actor) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(sku, now, delta, reason, text(input.reference), actor),
    env.REGISTRY.prepare('UPDATE materials SET on_hand = on_hand + ?, updated_at = ? WHERE sku = ?')
      .bind(delta, now, sku)
  ]);
  return json({ sku, on_hand: m.on_hand + delta }, 201);
}

/* ---------------------------------------------------------------- orders */

async function listOrders(env) {
  const [orders, lines] = await env.REGISTRY.batch([
    env.REGISTRY.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 100'),
    env.REGISTRY.prepare(
      `SELECT l.reference, l.sku, l.qty, m.name, m.unit FROM po_lines l JOIN materials m ON m.sku = l.sku`
    )
  ]);
  const by = {};
  for (const l of lines.results) (by[l.reference] = by[l.reference] || []).push(l);
  return { orders: orders.results.map((o) => ({ ...o, lines: by[o.reference] || [] })) };
}

async function createOrder(env, input, actor) {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const problems = [];
  const clean = [];
  const seen = new Set();
  for (const l of lines) {
    const sku = normalise(l.sku);
    const qty = Number(l.qty);
    if (!sku) continue;
    if (seen.has(sku)) { problems.push(`${sku} is on the order twice.`); continue; }
    seen.add(sku);
    if (!Number.isFinite(qty) || qty <= 0) { problems.push(`${sku} needs a quantity.`); continue; }
    clean.push({ sku, qty });
  }
  if (!clean.length && !problems.length) problems.push('An order needs at least one line.');
  if (clean.length) {
    const known = await env.REGISTRY.prepare(
      `SELECT sku FROM materials WHERE sku IN (${clean.map(() => '?').join(',')})`
    ).bind(...clean.map((l) => l.sku)).all();
    const have = new Set(known.results.map((r) => r.sku));
    for (const l of clean) if (!have.has(l.sku)) problems.push(`${l.sku} is not a listed material.`);
  }
  if (problems.length) return json({ error: 'Nothing was ordered.', problems }, 422);

  const ref = reference('PO');
  const now = new Date().toISOString();
  await env.REGISTRY.batch([
    env.REGISTRY.prepare(
      `INSERT INTO purchase_orders (reference, status, needed_by, created_by, created_at) VALUES (?, 'draft', ?, ?, ?)`
    ).bind(ref, text(input.needed_by), actor, now),
    ...clean.map((l) => env.REGISTRY.prepare('INSERT INTO po_lines (reference, sku, qty) VALUES (?, ?, ?)')
      .bind(ref, l.sku, l.qty))
  ]);
  return json({ reference: ref, status: 'draft' }, 201);
}

async function actOnOrder(env, ref, action, session) {
  const po = await env.REGISTRY.prepare('SELECT * FROM purchase_orders WHERE reference = ?').bind(ref).first();
  if (!po) return json({ error: `No order ${ref}.` }, 404);
  const now = new Date().toISOString();
  const allowed = { approve: ['draft'], receive: ['approved'], cancel: ['draft', 'approved'] }[action];
  if (!allowed) return json({ error: 'No such order action.' }, 404);
  if (!allowed.includes(po.status)) return json({ error: `${ref} is ${po.status}; it cannot be ${action}d.` }, 409);

  if (action === 'approve') {
    // Spending is an administrator's call, and not the requester's own.
    if (!isAdmin(session)) return json({ error: 'Only an administrator approves an order.' }, 403);
    if (po.created_by === session.sub) return json({ error: 'An order is approved by someone other than who drafted it.' }, 403);
    await env.REGISTRY.prepare(
      `UPDATE purchase_orders SET status = 'approved', approved_by = ?, approved_at = ? WHERE reference = ?`
    ).bind(session.sub, now, ref).run();
  } else if (action === 'cancel') {
    await env.REGISTRY.prepare(`UPDATE purchase_orders SET status = 'cancelled' WHERE reference = ?`).bind(ref).run();
  } else {
    const lines = await env.REGISTRY.prepare('SELECT sku, qty FROM po_lines WHERE reference = ?').bind(ref).all();
    await env.REGISTRY.batch([
      env.REGISTRY.prepare(`UPDATE purchase_orders SET status = 'received', received_at = ? WHERE reference = ?`)
        .bind(now, ref),
      ...lines.results.flatMap((l) => [
        env.REGISTRY.prepare(
          `INSERT INTO material_moves (sku, at, delta, reason, reference, actor) VALUES (?, ?, ?, 'received', ?, ?)`
        ).bind(l.sku, now, l.qty, ref, session.sub),
        env.REGISTRY.prepare('UPDATE materials SET on_hand = on_hand + ?, updated_at = ? WHERE sku = ?')
          .bind(l.qty, now, l.sku)
      ])
    ]);
  }
  return json({ reference: ref, status: { approve: 'approved', receive: 'received', cancel: 'cancelled' }[action] });
}

/* ------------------------------------------------------------------ time */

/** The Monday (UTC) starting the week that holds `iso`. */
function weekStart(iso) {
  const d = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00Z') : new Date();
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

async function timeWeek(env, url, session) {
  const start = weekStart(url.searchParams.get('week'));
  const end = new Date(start.getTime() + 7 * DAY);
  const now = Date.now();
  const rows = await env.REGISTRY.prepare(
    `SELECT * FROM time_entries WHERE clock_in >= ? AND clock_in < ? ORDER BY clock_in`
  ).bind(start.toISOString(), end.toISOString()).all();
  const mine = await env.REGISTRY.prepare(
    'SELECT * FROM time_entries WHERE member = ? AND clock_out IS NULL'
  ).bind(session.sub).first();

  const members = {};
  const byBatch = {};
  for (const e of rows.results) {
    const m = members[e.member] || (members[e.member] = {
      member: e.member, name: e.member_name, days: [0, 0, 0, 0, 0, 0, 0], total: 0, open: false
    });
    const h = hours(e, now);
    const d = Math.floor((Date.parse(e.clock_in) - start.getTime()) / DAY);
    m.days[d] += h;
    m.total += h;
    if (!e.clock_out) m.open = true;
    const key = e.batch_number || '';
    byBatch[key] = (byBatch[key] || 0) + h;
  }
  const list = Object.values(members).map((m) => ({ ...m, days: m.days.map((h) => round(h)), total: round(m.total) }));
  return {
    week: start.toISOString().slice(0, 10),
    members: list.sort((a, b) => a.name.localeCompare(b.name)),
    by_batch: Object.entries(byBatch).map(([batch, h]) => ({ batch: batch || null, hours: round(h) }))
      .sort((a, b) => b.hours - a.hours),
    me: { member: session.sub, name: session.name, open: mine || null }
  };
}

async function openBatch(env, number) {
  if (!number) return null;
  return env.REGISTRY.prepare('SELECT batch_number FROM batches WHERE batch_number = ?').bind(number).first();
}

async function clockIn(env, input, session) {
  const batch = normalise(input.batch_number) || null;
  if (batch && !await openBatch(env, batch)) return json({ error: `No batch ${batch}.` }, 422);
  const open = await env.REGISTRY.prepare('SELECT id FROM time_entries WHERE member = ? AND clock_out IS NULL')
    .bind(session.sub).first();
  if (open) return json({ error: 'You are already clocked in. Clock out first.' }, 409);
  await env.REGISTRY.prepare(
    `INSERT INTO time_entries (member, member_name, clock_in, batch_number, activity, entered_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(session.sub, session.name, new Date().toISOString(), batch, text(input.activity), session.sub).run();
  return json({ clocked_in: true }, 201);
}

async function clockOut(env, session) {
  const open = await env.REGISTRY.prepare('SELECT * FROM time_entries WHERE member = ? AND clock_out IS NULL')
    .bind(session.sub).first();
  if (!open) return json({ error: 'You are not clocked in.' }, 409);
  const now = new Date().toISOString();
  await env.REGISTRY.prepare('UPDATE time_entries SET clock_out = ? WHERE id = ?').bind(now, open.id).run();
  return json({ clocked_out: true, hours: round(hours({ ...open, clock_out: now })) });
}

/** A lead's correction: a finished stretch entered for anyone. Admin only. */
async function addEntry(env, input, session) {
  if (!isAdmin(session)) return json({ error: 'Only an administrator enters time for someone else.' }, 403);
  const member = text(input.member);
  const name = text(input.member_name);
  const start = Date.parse(input.clock_in);
  const end = Date.parse(input.clock_out);
  const problems = [];
  if (!member || !name) problems.push('Say whose time this is.');
  if (!Number.isFinite(start) || !Number.isFinite(end)) problems.push('Give a start and an end time.');
  else if (end <= start) problems.push('The end is before the start.');
  else if (end - start > 16 * 36e5) problems.push('One stretch is at most 16 hours; enter a long day as two.');
  const batch = normalise(input.batch_number) || null;
  if (batch && !await openBatch(env, batch)) problems.push(`No batch ${batch}.`);
  if (problems.length) return json({ error: 'Nothing was entered.', problems }, 422);
  await env.REGISTRY.prepare(
    `INSERT INTO time_entries (member, member_name, clock_in, clock_out, batch_number, activity, entered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(member, name, new Date(start).toISOString(), new Date(end).toISOString(), batch,
         text(input.activity), session.sub).run();
  return json({ entered: true }, 201);
}

/* --------------------------------------------------------------- metrics */

/**
 * The five headline numbers. Each is computed, never typed, and each says
 * what it was computed from, so an empty facility shows gaps rather than
 * flattering zeros.
 */
async function metrics(env, url) {
  const span = Math.min(Math.max(Number(url.searchParams.get('days')) || 90, 7), 730);
  const now = Date.now();
  const since = new Date(now - span * DAY).toISOString();

  const [batches, returns, time, stock, usage] = await env.REGISTRY.batch([
    env.REGISTRY.prepare(
      `SELECT * FROM batches WHERE started_at >= ? OR released_at >= ? ORDER BY started_at DESC`
    ).bind(since, since),
    // A leg counts once however many times it came back: the question is how
    // many of a batch's legs failed early, not how noisy one of them was.
    env.REGISTRY.prepare(
      `SELECT l.batch AS batch,
              COUNT(*) AS commissioned,
              SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM leg_events e
                     WHERE e.mechanical_serial = l.mechanical_serial
                       AND e.type IN ('flag-raised', 'dispatch-request')
                       AND julianday(e.at) - julianday(l.commissioned_at) BETWEEN 0 AND 90
                  ) THEN 1 ELSE 0 END) AS early
         FROM legs l
        WHERE l.batch IS NOT NULL AND l.commissioned_at IS NOT NULL
        GROUP BY l.batch`
    ),
    env.REGISTRY.prepare('SELECT * FROM time_entries WHERE batch_number IS NOT NULL'),
    env.REGISTRY.prepare('SELECT sku, name, on_hand FROM materials'),
    env.REGISTRY.prepare(
      `SELECT sku, -SUM(delta) AS used FROM material_moves WHERE reason = 'used' AND at >= ? GROUP BY sku`
    ).bind(new Date(now - 30 * DAY).toISOString())
  ]);

  const B = batches.results;
  const early = Object.fromEntries(returns.results.map((r) => [r.batch, r]));

  const qa = B.filter((b) => b.qa_inspected);
  const inspected = qa.reduce((n, b) => n + b.qa_inspected, 0);
  const passed = qa.reduce((n, b) => n + b.qa_first_pass, 0);

  const inWindow = B.map((b) => early[b.batch_number]).filter(Boolean);
  const commissioned = inWindow.reduce((n, r) => n + r.commissioned, 0);
  const failed = inWindow.reduce((n, r) => n + r.early, 0);

  const released = B.filter((b) => b.released_at);
  const stageDays = (from, to) => median(released.filter((b) => b[from] && b[to]).map((b) => days(b[from], b[to])));

  const hoursBy = {};
  for (const e of time.results) hoursBy[e.batch_number] = (hoursBy[e.batch_number] || 0) + hours(e, now);
  const costed = released.filter((b) => hoursBy[b.batch_number]);
  const labourHours = costed.reduce((n, b) => n + hoursBy[b.batch_number], 0);
  const labourUnits = costed.reduce((n, b) => n + b.frame_count, 0);

  const used = Object.fromEntries(usage.results.map((u) => [u.sku, u.used]));
  const cover = stock.results
    .filter((m) => used[m.sku] > 0)
    .map((m) => ({ sku: m.sku, name: m.name, days: Math.max(m.on_hand, 0) / (used[m.sku] / 30) }))
    .sort((a, b) => a.days - b.days);

  return {
    days: span,
    first_pass_yield: {
      value: inspected ? round((passed / inspected) * 100) : null,
      inspected, passed, batches: qa.length
    },
    early_life_failures: {
      value: commissioned ? round((failed / commissioned) * 100) : null,
      failed, commissioned
    },
    cycle_time: {
      value: round(median(released.map((b) => days(b.started_at, b.released_at)))),
      batches: released.length,
      stages: {
        assembly: round(stageDays('started_at', 'qa_at')),
        qa: round(stageDays('qa_at', 'commissioning_at')),
        commissioning: round(stageDays('commissioning_at', 'released_at'))
      }
    },
    labour_per_unit: {
      value: labourUnits ? round(labourHours / labourUnits) : null,
      hours: round(labourHours), units: labourUnits
    },
    days_of_cover: cover.length
      ? { value: round(cover[0].days, 0), sku: cover[0].sku, name: cover[0].name }
      : { value: null },
    by_batch: B.slice(0, 12).map((b) => ({
      batch_number: b.batch_number,
      variant: b.variant,
      stage: b.stage,
      first_pass_yield: b.qa_inspected ? round((b.qa_first_pass / b.qa_inspected) * 100) : null,
      commissioned: early[b.batch_number] ? early[b.batch_number].commissioned : 0,
      early_failures: early[b.batch_number] ? early[b.batch_number].early : 0
    }))
  };
}

/* --------------------------------------------------------------- routing */

export async function handleManufacturing(request, env, url, parts, session, doc) {
  const method = request.method;
  const [area, id, action] = parts;
  const input = method === 'POST' || method === 'PATCH' ? await body(request) : {};
  if (input === null) return json({ error: 'Malformed JSON.' }, 400);

  if (area === 'batches') {
    if (!id && method === 'GET') return json(await listBatches(env));
    if (!id && method === 'POST') return createBatch(env, doc, input, session.sub);
    if (id && !action && method === 'PATCH') return updateBatch(env, normalise(decodeURIComponent(id)), input);
  }

  if (area === 'materials') {
    if (!id && method === 'GET') return json(await listMaterials(env));
    if (!id && method === 'POST') return createMaterial(env, input, session.sub);
    const sku = id && normalise(decodeURIComponent(id));
    if (sku && !action && method === 'PATCH') return updateMaterial(env, sku, input);
    if (sku && action === 'moves' && method === 'POST') return recordMove(env, sku, input, session.sub);
  }

  if (area === 'orders') {
    if (!id && method === 'GET') return json(await listOrders(env));
    if (!id && method === 'POST') return createOrder(env, input, session.sub);
    if (id && action && method === 'POST') return actOnOrder(env, decodeURIComponent(id), action, session);
  }

  if (area === 'time') {
    if (!id && method === 'GET') return json(await timeWeek(env, url, session));
    if (id === 'clock-in' && method === 'POST') return clockIn(env, input, session);
    if (id === 'clock-out' && method === 'POST') return clockOut(env, session);
    if (id === 'entries' && method === 'POST') return addEntry(env, input, session);
  }

  if (area === 'metrics' && method === 'GET') return json(await metrics(env, url));

  return json({ error: 'No such manufacturing endpoint.' }, 404);
}
