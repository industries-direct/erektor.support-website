/**
 * /api/registry/* — the leg registry.
 *
 * docs/ers.html#registry describes this as "an always-online registry of every
 * leg across every facility", whose main job is preventing a false loss. This
 * is that registry, and the shape of it follows from three facts the rest of
 * the site already states:
 *
 *  1. The durable entity is the LEG. There is no persistent Erektor above it,
 *     so there is no machine record to hang a leg off — the leg is the record.
 *  2. A leg has two identities. The registry is keyed on the MECHANICAL serial
 *     because wear, intervals, warranty and the lease follow the frame; the
 *     electronics serial is a current binding that a swap rewrites.
 *  3. Every leg comes home. So the interesting question is never "where is it
 *     now" alone — it is "what does it carry when it gets here", which is why
 *     an open flag is a column on the leg and not a ticket somewhere else.
 *
 * Storage is D1 (`REGISTRY`). Events are append-only and the `legs` table is a
 * projection of them, updated in the same batch. Unlike the public intake this
 * fails closed: an unprovisioned deployment answers 503 rather than pretending.
 */

import { SERIAL, normalise } from './serials.js';
import { sessionFor, canWrite, isAdmin, crossSite } from './auth.js';

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });

const MAX_BATCH = 200;
const PAGE = 100;

/* ------------------------------------------------------------- lifecycle */

// data/lifecycle.json is the table this module obeys — states, transitions,
// which event implies which state, and the intervals. It is fetched from the
// asset layer rather than duplicated here so the console, the docs and the
// Worker cannot disagree about what a state means.
let lifecycle = null;
async function rules(env, request) {
  if (!lifecycle) {
    const res = await env.ASSETS.fetch(new URL('/data/lifecycle.json', request.url));
    if (!res.ok) throw new Error('lifecycle.json unavailable: HTTP ' + res.status);
    const doc = await res.json();
    lifecycle = {
      doc,
      states: new Map(doc.states.map((s) => [s.id, s])),
      events: new Map(doc.events.map((e) => [e.id, e]))
    };
  }
  return lifecycle;
}

/* ------------------------------------------------------------ projection */

const COLUMNS = [
  'mechanical_serial', 'electronics_serial', 'variant', 'controller', 'firmware',
  'state', 'stage', 'holder', 'location', 'flag_code', 'flag_reference',
  'flag_raised_at', 'motor_hours', 'hours_at_service', 'built_at',
  'commissioned_at', 'last_service_at', 'last_seen_at', 'batch', 'notes',
  'created_at', 'updated_at'
];

// Fields an operator edits directly. State is deliberately absent: it moves
// only by recording an event, so the history explains every move.
const EDITABLE = ['variant', 'controller', 'firmware', 'holder', 'location', 'batch', 'notes', 'built_at'];

const text = (v) => {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s.slice(0, 2000);
};

/** Derived fields the console needs and the database should not store. */
function decorate(row, doc, now) {
  if (!row) return row;
  const iv = doc.intervals;
  const since = (row.motor_hours || 0) - (row.hours_at_service || 0);
  const dueMonths = row.last_service_at
    ? Date.parse(row.last_service_at) + iv.months * 30.44 * 864e5 <= now
    : false;
  const stale = row.last_seen_at
    ? Date.parse(row.last_seen_at) + doc.reconciliation.staleDays * 864e5 <= now
    : true;
  return {
    ...row,
    hours_since_service: Math.round(since * 10) / 10,
    interval_fraction: iv.motorHours ? Math.round((since / iv.motorHours) * 100) / 100 : 0,
    due: since >= iv.motorHours || dueMonths,
    due_soon: !dueMonths && since >= iv.motorHours * iv.warnAtFraction && since < iv.motorHours,
    stale
  };
}

/* -------------------------------------------------------------- validation */

function checkNewLeg(leg, doc) {
  const problems = [];
  const mx = normalise(leg.mechanical_serial);
  if (!mx) problems.push('Mechanical serial is required — it is the leg’s identity.');
  else if (!SERIAL.mechanical.test(mx)) problems.push(`${mx} is not a mechanical serial (MX-24-08192).`);

  const el = normalise(leg.electronics_serial);
  if (el && !SERIAL.electronics.test(el)) problems.push(`${el} is not an electronics serial (EL-25-014873).`);

  if (!text(leg.variant)) problems.push(`${mx || 'A leg'} needs a variant.`);

  const state = leg.state || (el ? 'commissioned' : 'built');
  if (!doc.states.some((s) => s.id === state)) problems.push(`Unknown state "${state}".`);

  // A leg with no ClearCore bound has no operational identity, so it cannot be
  // in any state that implies one. Catching it here keeps the fleet count
  // honest at the point of entry rather than at the point of assignment.
  if (!el && !['built', 'quarantine', 'retired'].includes(state)) {
    problems.push(`${mx || 'A leg'} has no electronics serial, so it cannot be "${state}" yet.`);
  }
  return { problems, mx, el, state };
}

/* ------------------------------------------------------------- the writer */

/**
 * The one write path. Appends an event and moves the projection in a single
 * batch, so the log and the current state cannot disagree.
 */
async function record(env, life, leg, ev, actor) {
  const doc = life.doc;
  const now = new Date().toISOString();
  const spec = life.events.get(ev.type);
  if (!spec) return { problems: [`Unknown event type "${ev.type}".`] };

  const from = leg.state;
  const to = ev.state || spec.sets || from;
  if (to !== from) {
    const src = life.states.get(from);
    if (!src || !src.to.includes(to)) {
      return { problems: [`A leg cannot go from "${from}" to "${to}". Allowed: ${(src ? src.to : []).join(', ') || 'nothing'}.`] };
    }
  }

  const set = { state: to, last_seen_at: now, updated_at: now };

  // Binding events roll the operational identity over. The frame keeps its
  // history; that is the whole reason the key is the mechanical serial.
  if (spec.binds) {
    const el = normalise(ev.electronics_serial);
    if (!el || !SERIAL.electronics.test(el)) {
      return { problems: ['This event binds a ClearCore, so it needs an electronics serial (EL-25-014873).'] };
    }
    if (el !== leg.electronics_serial) {
      const held = await env.REGISTRY
        .prepare('SELECT mechanical_serial FROM legs WHERE electronics_serial = ?').bind(el).first();
      if (held) return { problems: [`${el} is already bound to ${held.mechanical_serial}.`] };
    }
    set.electronics_serial = el;
    if (ev.type === 'commissioned' && !leg.commissioned_at) set.commissioned_at = now;
  }

  if (ev.controller !== undefined) set.controller = text(ev.controller);
  if (ev.firmware !== undefined) set.firmware = text(ev.firmware);
  if (ev.holder !== undefined) set.holder = text(ev.holder);
  if (ev.location !== undefined) set.location = text(ev.location);

  // Stage only means something on the line; leaving it set elsewhere would
  // have the console showing a leg at "diagnostics" while it is at a site.
  set.stage = to === 'line' ? (text(ev.stage) || leg.stage || doc.states.find((s) => s.id === 'line').stages[0]) : null;

  // Motor-hours are a lifetime reading off the controller, not a delta, and
  // they only ever go up. A lower number means someone read the wrong leg.
  let hours = null;
  if (ev.motor_hours !== undefined && ev.motor_hours !== null && ev.motor_hours !== '') {
    hours = Number(ev.motor_hours);
    if (!Number.isFinite(hours) || hours < 0) return { problems: ['Motor-hours must be a number.'] };
    if (hours < (leg.motor_hours || 0)) {
      return { problems: [`Motor-hours cannot fall. ${leg.mechanical_serial} is already at ${leg.motor_hours}.`] };
    }
    set.motor_hours = hours;
  }

  if (ev.type === 'flag-raised') {
    const code = normalise(ev.fault_code);
    if (!code) return { problems: ['A flag needs the fault code it was raised on.'] };
    set.flag_code = code;
    set.flag_reference = text(ev.reference);
    set.flag_raised_at = now;
  }
  if (ev.type === 'flag-cleared' || spec.resetsInterval) {
    set.flag_code = null;
    set.flag_reference = null;
    set.flag_raised_at = null;
  }
  // Only a closed service record resets the interval. Not a controller swap —
  // which is exactly the point of keying wear to the frame.
  if (spec.resetsInterval) {
    set.hours_at_service = set.motor_hours !== undefined ? set.motor_hours : (leg.motor_hours || 0);
    set.last_service_at = now;
  }

  const keys = Object.keys(set);
  await env.REGISTRY.batch([
    env.REGISTRY.prepare(
      `INSERT INTO leg_events
         (mechanical_serial, at, type, actor, from_state, to_state,
          electronics_serial, fault_code, reference, hours, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      leg.mechanical_serial, now, ev.type, actor,
      from, to === from ? null : to,
      set.electronics_serial || leg.electronics_serial || null,
      normalise(ev.fault_code) || null,
      text(ev.reference), hours, text(ev.detail)
    ),
    env.REGISTRY.prepare(
      `UPDATE legs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE mechanical_serial = ?`
    ).bind(...keys.map((k) => set[k]), leg.mechanical_serial)
  ]);

  return { problems: [], state: to };
}

/* ---------------------------------------------------------------- reads */

async function getLeg(env, mx) {
  return env.REGISTRY.prepare(`SELECT ${COLUMNS.join(', ')} FROM legs WHERE mechanical_serial = ?`)
    .bind(mx).first();
}

async function listLegs(env, url, doc) {
  const where = [];
  const bind = [];
  const now = Date.now();

  const state = url.searchParams.get('state');
  if (state && state !== 'all') { where.push('state = ?'); bind.push(state); }

  const variant = url.searchParams.get('variant');
  if (variant) { where.push('variant = ?'); bind.push(variant); }

  const holder = url.searchParams.get('holder');
  if (holder) { where.push('holder = ?'); bind.push(holder); }

  if (url.searchParams.get('flagged') === '1') where.push('flag_code IS NOT NULL');

  if (url.searchParams.get('due') === '1') {
    where.push('((motor_hours - hours_at_service) >= ? OR (last_service_at IS NOT NULL AND last_service_at < ?))');
    bind.push(doc.intervals.motorHours,
      new Date(now - doc.intervals.months * 30.44 * 864e5).toISOString());
  }

  if (url.searchParams.get('stale') === '1') {
    where.push('(last_seen_at IS NULL OR last_seen_at < ?)');
    bind.push(new Date(now - doc.reconciliation.staleDays * 864e5).toISOString());
  }

  // One box, either serial, or any free text an operator wrote down. A leg is
  // looked up in the field from whatever number is legible at the time.
  const q = (url.searchParams.get('q') || '').trim();
  if (q) {
    const like = `%${q.toUpperCase()}%`;
    where.push(`(UPPER(mechanical_serial) LIKE ? OR UPPER(COALESCE(electronics_serial,'')) LIKE ?
                 OR UPPER(COALESCE(holder,'')) LIKE ? OR UPPER(COALESCE(location,'')) LIKE ?
                 OR UPPER(COALESCE(batch,'')) LIKE ?)`);
    bind.push(like, like, like, like, like);
  }

  const clause = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || PAGE, 500);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  const [rows, total] = await Promise.all([
    env.REGISTRY.prepare(
      `SELECT ${COLUMNS.join(', ')} FROM legs${clause} ORDER BY mechanical_serial LIMIT ? OFFSET ?`
    ).bind(...bind, limit, offset).all(),
    env.REGISTRY.prepare(`SELECT COUNT(*) AS n FROM legs${clause}`).bind(...bind).first()
  ]);

  return {
    total: total.n,
    offset,
    limit,
    legs: rows.results.map((r) => decorate(r, doc, now))
  };
}

async function summary(env, doc) {
  const now = Date.now();
  const hoursCut = doc.intervals.motorHours;
  const monthCut = new Date(now - doc.intervals.months * 30.44 * 864e5).toISOString();
  const staleCut = new Date(now - doc.reconciliation.staleDays * 864e5).toISOString();

  const [states, variants, totals, recent] = await env.REGISTRY.batch([
    env.REGISTRY.prepare('SELECT state, COUNT(*) AS n FROM legs GROUP BY state'),
    env.REGISTRY.prepare('SELECT variant, COUNT(*) AS n FROM legs GROUP BY variant ORDER BY n DESC'),
    env.REGISTRY.prepare(
      `SELECT COUNT(*) AS fleet,
              SUM(CASE WHEN flag_code IS NOT NULL THEN 1 ELSE 0 END) AS flagged,
              SUM(CASE WHEN (motor_hours - hours_at_service) >= ?1
                         OR (last_service_at IS NOT NULL AND last_service_at < ?2)
                       THEN 1 ELSE 0 END) AS due,
              SUM(CASE WHEN last_seen_at IS NULL OR last_seen_at < ?3 THEN 1 ELSE 0 END) AS stale,
              SUM(motor_hours) AS hours
         FROM legs`
    ).bind(hoursCut, monthCut, staleCut),
    env.REGISTRY.prepare(
      `SELECT e.at, e.type, e.mechanical_serial, e.actor, e.to_state, e.fault_code, e.detail
         FROM leg_events e ORDER BY e.id DESC LIMIT 12`
    )
  ]);

  const orphans = await env.REGISTRY
    .prepare('SELECT COUNT(*) AS n FROM orphan_intake WHERE resolved_at IS NULL').first();

  const t = totals.results[0] || {};
  return {
    revision: doc.revision,
    fleet: t.fleet || 0,
    flagged: t.flagged || 0,
    due: t.due || 0,
    stale: t.stale || 0,
    motorHours: Math.round(t.hours || 0),
    unmatchedIntake: orphans.n || 0,
    byState: Object.fromEntries(states.results.map((r) => [r.state, r.n])),
    byVariant: variants.results,
    recent: recent.results
  };
}

function csv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n');
}

/* ------------------------------------------------------ intake reconciliation */

/**
 * Called from the public intake after a field request validates. A flag or a
 * dispatch filed against a leg is part of that leg's history, so it lands on
 * the record rather than in a separate queue nobody reads next to the leg.
 *
 * Never throws: the public form has already promised the operator a reference
 * number, and a registry that is down must not turn that into an error.
 */
export async function reconcileIntake(env, record_) {
  if (!env.REGISTRY) return;
  try {
    const { identity, serial } = record_.subject;
    if (!serial) return;

    const leg = identity === 'mechanical'
      ? await env.REGISTRY.prepare('SELECT * FROM legs WHERE mechanical_serial = ?').bind(serial).first()
      : await env.REGISTRY.prepare('SELECT * FROM legs WHERE electronics_serial = ?').bind(serial).first();

    const code = normalise(record_.fields.fault_code) || null;

    if (!leg) {
      // The spillway. A request against an unknown serial is a bookkeeping
      // problem to surface, not a message to drop.
      await env.REGISTRY.prepare(
        `INSERT OR REPLACE INTO orphan_intake
           (reference, at, kind, identity, serial, fault_code, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(record_.reference, record_.receivedAt, record_.kind, identity, serial, code,
        JSON.stringify(record_.fields)).run();
      return;
    }

    const isFlag = record_.kind === 'flag';
    const now = record_.receivedAt;
    const set = isFlag
      ? { flag_code: code || 'SES-30', flag_reference: record_.reference, flag_raised_at: now,
          last_seen_at: now, updated_at: now }
      : { last_seen_at: now, updated_at: now };

    const keys = Object.keys(set);
    await env.REGISTRY.batch([
      env.REGISTRY.prepare(
        `INSERT INTO leg_events
           (mechanical_serial, at, type, actor, from_state, to_state,
            electronics_serial, fault_code, reference, hours, detail)
         VALUES (?, ?, ?, 'portal', ?, NULL, ?, ?, ?, NULL, ?)`
      ).bind(
        leg.mechanical_serial, now, isFlag ? 'flag-raised' : 'dispatch-request',
        leg.state, leg.electronics_serial, code, record_.reference,
        text(isFlag ? record_.fields.reason : record_.fields.symptom)
      ),
      env.REGISTRY.prepare(
        `UPDATE legs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE mechanical_serial = ?`
      ).bind(...keys.map((k) => set[k]), leg.mechanical_serial)
    ]);
  } catch (err) {
    console.error('registry reconciliation failed', err);
  }
}

/* --------------------------------------------------------------- routing */

export async function handleRegistry(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/registry\/?/, '').replace(/\/$/, '');
  const method = request.method;

  if (!env.REGISTRY) {
    return json({ error: 'The registry is not provisioned on this deployment.' }, 503);
  }

  const session = await sessionFor(request, env);
  if (!session) return json({ error: 'Sign in to the registry.' }, 401);

  const writing = method !== 'GET' && method !== 'HEAD';
  if (writing) {
    if (crossSite(request)) return json({ error: 'Cross-site request refused.' }, 403);
    if (!canWrite(session)) return json({ error: 'Your access is read-only.' }, 403);
  }

  const life = await rules(env, request);
  const doc = life.doc;
  const parts = path ? path.split('/') : [];

  /* ---- collection ---- */

  if (parts[0] === 'summary' && method === 'GET') return json(await summary(env, doc));

  if (parts[0] === 'lifecycle' && method === 'GET') return json(doc);

  if (parts[0] === 'export' && method === 'GET') {
    const rows = await env.REGISTRY.prepare(
      `SELECT ${COLUMNS.join(', ')} FROM legs ORDER BY mechanical_serial`
    ).all();
    return new Response(csv(rows.results), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'cache-control': 'no-store',
        'content-disposition': `attachment; filename="erektor-legs-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  if (parts[0] === 'orphans') {
    if (method === 'GET') {
      const rows = await env.REGISTRY.prepare(
        'SELECT * FROM orphan_intake WHERE resolved_at IS NULL ORDER BY at DESC LIMIT 100'
      ).all();
      return json({ orphans: rows.results });
    }
    if (method === 'POST' && parts[1]) {
      await env.REGISTRY.prepare('UPDATE orphan_intake SET resolved_at = ? WHERE reference = ?')
        .bind(new Date().toISOString(), parts[1]).run();
      return json({ ok: true });
    }
  }

  if (parts[0] === 'legs' && parts.length === 1) {
    if (method === 'GET') return json(await listLegs(env, url, doc));

    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Malformed JSON.' }, 400); }
      const incoming = Array.isArray(body) ? body : Array.isArray(body.legs) ? body.legs : [body];
      if (!incoming.length) return json({ error: 'Nothing to enter.' }, 422);
      if (incoming.length > MAX_BATCH) {
        return json({ error: `Enter at most ${MAX_BATCH} legs at a time.` }, 413);
      }

      // A batch is all-or-nothing on validation. Half a work order in the
      // registry is worse than none: the operator cannot tell which half.
      const checked = incoming.map((leg) => ({ leg, ...checkNewLeg(leg, doc) }));
      const problems = checked.flatMap((c) => c.problems);
      const seen = new Set();
      for (const c of checked) {
        if (c.mx && seen.has(c.mx)) problems.push(`${c.mx} appears twice in this batch.`);
        seen.add(c.mx);
      }
      if (problems.length) return json({ error: 'Nothing was entered.', problems }, 422);

      const existing = await env.REGISTRY.prepare(
        `SELECT mechanical_serial FROM legs WHERE mechanical_serial IN (${checked.map(() => '?').join(',')})`
      ).bind(...checked.map((c) => c.mx)).all();
      if (existing.results.length) {
        return json({
          error: 'Nothing was entered.',
          problems: existing.results.map((r) => `${r.mechanical_serial} is already in the registry.`)
        }, 409);
      }

      const now = new Date().toISOString();
      const statements = [];
      for (const c of checked) {
        const l = c.leg;
        statements.push(env.REGISTRY.prepare(
          `INSERT INTO legs
             (mechanical_serial, electronics_serial, variant, controller, firmware,
              state, holder, location, motor_hours, hours_at_service, built_at,
              commissioned_at, last_seen_at, batch, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          c.mx, c.el || null, text(l.variant), text(l.controller), text(l.firmware),
          c.state, text(l.holder), text(l.location), Number(l.motor_hours) || 0,
          text(l.built_at) || now, c.el ? now : null, now,
          text(l.batch), text(l.notes), now, now
        ));
        statements.push(env.REGISTRY.prepare(
          `INSERT INTO leg_events
             (mechanical_serial, at, type, actor, from_state, to_state, electronics_serial, detail)
           VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`
        ).bind(
          c.mx, now, c.el ? 'commissioned' : 'built', session.sub, c.state, c.el || null,
          text(l.batch) ? 'Batch ' + text(l.batch) : null
        ));
      }
      await env.REGISTRY.batch(statements);
      return json({ entered: checked.length, serials: checked.map((c) => c.mx) }, 201);
    }
  }

  /* ---- one leg ---- */

  if (parts[0] === 'legs' && parts[1]) {
    const mx = normalise(decodeURIComponent(parts[1]));
    const leg = await getLeg(env, mx);
    if (!leg) return json({ error: `No registry record for ${mx}.` }, 404);

    if (parts.length === 2 && method === 'GET') {
      const events = await env.REGISTRY.prepare(
        'SELECT * FROM leg_events WHERE mechanical_serial = ? ORDER BY id DESC LIMIT 200'
      ).bind(mx).all();
      return json({ leg: decorate(leg, doc, Date.now()), events: events.results });
    }

    if (parts.length === 2 && method === 'PATCH') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Malformed JSON.' }, 400); }
      const set = {};
      for (const k of EDITABLE) if (body[k] !== undefined) set[k] = text(body[k]);
      if (!Object.keys(set).length) {
        return json({ error: `Editable here: ${EDITABLE.join(', ')}. State moves by recording an event.` }, 422);
      }
      set.updated_at = new Date().toISOString();
      const keys = Object.keys(set);
      await env.REGISTRY.prepare(
        `UPDATE legs SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE mechanical_serial = ?`
      ).bind(...keys.map((k) => set[k]), mx).run();
      return json({ leg: decorate(await getLeg(env, mx), doc, Date.now()) });
    }

    if (parts[2] === 'events' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Malformed JSON.' }, 400); }
      const out = await record(env, life, leg, body, session.sub);
      if (out.problems.length) return json({ error: 'Nothing was recorded.', problems: out.problems }, 422);
      const events = await env.REGISTRY.prepare(
        'SELECT * FROM leg_events WHERE mechanical_serial = ? ORDER BY id DESC LIMIT 200'
      ).bind(mx).all();
      return json({ leg: decorate(await getLeg(env, mx), doc, Date.now()), events: events.results }, 201);
    }

    if (parts.length === 2 && method === 'DELETE') {
      // Retiring is the normal end of a leg and keeps the history; deletion is
      // for a frame entered in error, and only an administrator does it.
      if (!isAdmin(session)) return json({ error: 'Only an administrator deletes a record.' }, 403);
      await env.REGISTRY.prepare('DELETE FROM legs WHERE mechanical_serial = ?').bind(mx).run();
      return json({ deleted: mx });
    }
  }

  return json({ error: 'No such registry endpoint.' }, 404);
}
