/**
 * POST /api/requests — service request intake.
 *
 * Cloudflare Pages Function. Both request channels (planned maintenance and
 * immediate dispatch) submit the same envelope here; urgency is a field, not a
 * separate pipeline, so one queue and one reference series covers both.
 *
 * Bindings (all optional — the endpoint degrades rather than failing):
 *   REQUESTS  KV namespace   durable store for submitted requests
 *   INTAKE_WEBHOOK  secret   URL forwarded to for ticketing/paging
 */

const KINDS = new Set(['maintenance', 'dispatch']);
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
  return `${kind === 'dispatch' ? 'DSP' : 'MNT'}-${stamp}-${rand}`;
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
  req('unit_serial', 'Unit serial');
  req('contact_name', 'Contact name');

  const email = (body.contact_email ?? '').trim();
  const phone = (body.contact_phone ?? '').trim();
  if (!email && !phone) problems.push('Give at least one of email or phone.');
  if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) problems.push('Email address looks malformed.');

  if (body._kind === 'dispatch') {
    req('site_address', 'Site address');
    req('fault_description', 'Fault description');
  } else {
    req('preferred_date', 'Preferred date');
  }
  return problems;
}

export async function onRequestPost({ request, env }) {
  if ((request.headers.get('content-type') || '').indexOf('application/json') === -1) {
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

  const record = {
    reference: reference(body._kind),
    kind: body._kind,
    status: 'received',
    receivedAt: new Date().toISOString(),
    source: {
      ip: request.headers.get('cf-connecting-ip') || null,
      country: request.cf?.country || null,
      userAgent: request.headers.get('user-agent') || null
    },
    fields: Object.fromEntries(
      Object.entries(body).filter(([k]) => !k.startsWith('_'))
    )
  };

  // Durable store, when bound. A storage failure must not lose the request:
  // the forward below is an independent path, and the client keeps a copy.
  if (env.REQUESTS) {
    try {
      await env.REQUESTS.put(`request:${record.reference}`, JSON.stringify(record), {
        metadata: { kind: record.kind, unit: record.fields.unit_serial ?? null }
      });
    } catch (err) {
      console.error('KV put failed', err);
      record.status = 'received-unstored';
    }
  } else {
    record.status = 'received-unstored';
  }

  // Forward to whatever actually pages a technician.
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
    receivedAt: record.receivedAt
  }, 201);
}

export const onRequestGet = () =>
  json({ error: 'Use POST to submit a service request.' }, 405);
