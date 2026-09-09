/**
 * POST /api/requests — service request intake.
 *
 * Invoked from the Worker entry in src/index.js. Both service routes submit
 * the same envelope: they differ in urgency and in which half of the leg's
 * identity they are filed against.
 *
 *   flag     -> filed against the MECHANICAL serial. Wear and service history
 *               live on the frame, so the flag must survive an electronics
 *               swap. No truck; ERS diverts the leg at inspection.
 *   dispatch -> filed against the ELECTRONICS serial, because that is what
 *               the session controller knows the leg by and what has to come
 *               out of the roster tonight.
 *
 * Bindings (all optional — the endpoint degrades rather than failing):
 *   REQUESTS        KV namespace   durable store for submitted requests
 *   INTAKE_WEBHOOK  secret         URL forwarded to for ticketing and paging
 *   REGISTRY        D1 database    the internal leg registry, if provisioned
 */

import { SERIAL } from './serials.js';
import { reconcileIntake } from './registry.js';

const KINDS = new Set(['flag', 'dispatch']);
const MAX_BODY = 32 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

function reference(kind) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
  const rand = [...crypto.getRandomValues(new Uint8Array(3))]
    .map((b) => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('')
    .slice(0, 4);
  return `${kind === 'dispatch' ? 'DSP' : 'FLG'}-${stamp}-${rand}`;
}

/** Field-level validation. Returns an array of human-readable problems. */
function validate(body) {
  const problems = [];
  const req = (k, label) => {
    const v = (body[k] ?? '').toString().trim();
    if (!v) problems.push(`${label} is required.`);
    return v;
  };

  if (!KINDS.has(body._kind)) problems.push('Unknown request kind.');
  req('contact_name', 'Contact name');
  req('facility', 'Facility');

  const email = (body.contact_email ?? '').trim();
  const phone = (body.contact_phone ?? '').trim();
  if (!email && !phone) problems.push('Give at least one of email or phone.');
  if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) problems.push('Email address looks malformed.');

  if (body._kind === 'dispatch') {
    const serial = req('electronics_serial', 'Electronics serial').toUpperCase();
    if (serial && !SERIAL.electronics.test(serial)) {
      problems.push('Electronics serial should look like EL-25-014873.');
    }
    req('site_address', 'Site address');
    req('symptom', 'What the leg is doing');
  } else {
    const serial = req('mechanical_serial', 'Mechanical serial').toUpperCase();
    if (serial && !SERIAL.mechanical.test(serial)) {
      problems.push('Mechanical serial should look like MX-24-08192. Service history follows the frame, not the electronics.');
    }
    req('reason', 'Reason for the flag');
  }
  return problems;
}

export async function handleServiceRequest(request, env) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json({ error: 'Expected application/json.' }, 415);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'Request body too large.' }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Malformed JSON.' }, 400);
  }

  const problems = validate(body);
  if (problems.length) return json({ error: 'Validation failed.', problems }, 422);

  const fields = Object.fromEntries(
    Object.entries(body).filter(([k]) => !k.startsWith('_'))
  );

  const record = {
    reference: reference(body._kind),
    kind: body._kind,
    status: 'received',
    receivedAt: new Date().toISOString(),
    // Which serial this request is filed against, so downstream systems know
    // whether it follows the frame or the electronics.
    subject: body._kind === 'dispatch'
      ? { identity: 'electronics', serial: (fields.electronics_serial || '').toUpperCase() }
      : { identity: 'mechanical', serial: (fields.mechanical_serial || '').toUpperCase() },
    source: {
      ip: request.headers.get('cf-connecting-ip') || null,
      country: request.cf?.country || null,
      userAgent: request.headers.get('user-agent') || null
    },
    fields
  };

  // Durable store, when bound. A storage failure must not lose the request:
  // the forward below is an independent path, and the client keeps a copy.
  if (env.REQUESTS) {
    try {
      await env.REQUESTS.put(`request:${record.reference}`, JSON.stringify(record), {
        metadata: { kind: record.kind, serial: record.subject.serial }
      });
    } catch (err) {
      console.error('KV put failed', err);
      record.status = 'received-unstored';
    }
  } else {
    record.status = 'received-unstored';
  }

  // Land it on the leg's own record. A flag or a dispatch is part of that
  // leg's history, and inspection reads flags off the frame — so the request
  // has to reach the registry, not just a queue beside it. Never throws: the
  // operator has already been promised a reference number.
  await reconcileIntake(env, record);

  // Forward to whatever actually pages a technician or books the pool leg.
  if (env.INTAKE_WEBHOOK) {
    try {
      await fetch(env.INTAKE_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (err) {
      console.error('Webhook forward failed', err);
    }
  }

  return json({
    reference: record.reference,
    status: record.status,
    kind: record.kind,
    subject: record.subject,
    receivedAt: record.receivedAt
  }, 201);
}
