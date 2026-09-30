/**
 * The account portal: /account/* and /api/account/*.
 *
 * The public site is for anyone standing next to a leg. The portal is for a
 * customer's own records: their facilities, and maintenance and emergency
 * replacements filed against them. It signs in with the same account as
 * erektor-return.systems, and an account that has not finished first-time
 * setup there is sent back to finish it.
 *
 * Like /internal/, it fails closed: no ACCOUNTS binding answers 503, no
 * session redirects to sign-in, and every query is scoped to the signed-in
 * user's company.
 */

import * as A from './accounts.js';
import { EXAMPLE, normalise, valid } from './serials.js';

const SITE = 'support';
const COOKIE = 'ers_portal';
const SETUP_URL = 'https://erektor-return.systems/';
const OPEN_PAGE = /^\/account\/signin(\.html)?$/;

// Every request filed here is emailed to the service desk through the
// NOTIFY send_email binding, which Cloudflare locks to one verified
// destination (wrangler.jsonc). Nothing is ever sent to the customer.
const NOTIFY_FROM = 'portal@erektor.support';
const NOTIFY_TO = 'erektobot@erektor.systems';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin'
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });

// Maintenance accrues against the frame; an emergency replacement is matched
// to tonight's roster by the electronics serial. The same split as the public
// forms: see docs/leg.html#identity.
const KINDS = {
  maintenance: { identity: 'mechanical', prefix: 'MNT' },
  emergency: { identity: 'electronics', prefix: 'EMR' }
};

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function reference(prefix) {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const tail = [...crypto.getRandomValues(new Uint8Array(3))]
    .map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}-${day}-${tail}`;
}

/** RFC 2047 encoding, so a company or facility name outside ASCII survives the subject line. */
function header(value) {
  return /^[\x20-\x7e]*$/.test(value)
    ? value
    : '=?UTF-8?B?' + btoa(String.fromCharCode(...new TextEncoder().encode(value))) + '?=';
}

/**
 * Email the service desk. A failure is logged, never raised: the request is
 * already on the account, and the customer must not see an error for it.
 */
async function notify(env, r) {
  if (!env.NOTIFY) return;
  const urgent = r.kind === 'emergency';
  const lines = [
    urgent ? 'EMERGENCY REPLACEMENT REQUESTED' : 'Maintenance scheduled',
    '',
    `Reference:   ${r.reference}`,
    `Company:     ${r.company}`,
    `Facility:    ${r.facility} (${r.facilityLocation || 'no location'}) - ERS ${r.ersStatus === 'live' ? 'live' : 'coming soon'}`,
    `${urgent ? 'Electronics' : 'Mechanical'} serial: ${r.serial}`,
    r.neededBy ? `Preferred date: ${r.neededBy}` : null,
    r.contact ? `On-site contact: ${r.contact}` : null,
    `Filed by:    ${r.filedBy}`,
    `Filed at:    ${new Date().toISOString()}`,
    '',
    r.details,
    ''
  ].filter((l) => l !== null);
  const subject = `${urgent ? '[EMERGENCY] ' : '[Maintenance] '}${r.reference} - ${r.company} - ${r.facility}`;
  const raw = [
    `From: Erektor account portal <${NOTIFY_FROM}>`,
    `To: <${NOTIFY_TO}>`,
    `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${r.reference.toLowerCase()}.${Date.now()}@erektor.support>`,
    urgent ? 'X-Priority: 1' : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    lines.join('\r\n')
  ].filter((l) => l !== null).join('\r\n');
  try {
    // Imported here rather than at the top so the Node test harness, which
    // has no cloudflare:email, can still load this module.
    const { EmailMessage } = await import('cloudflare:email');
    await env.NOTIFY.send(new EmailMessage(NOTIFY_FROM, NOTIFY_TO, raw));
  } catch (err) {
    console.error('request notification failed', r.reference, err);
  }
}

function pending(user) {
  return !!user.must_change_password || !user.setup_completed_at;
}

async function overview(db, user) {
  const [facilities, requests] = await db.batch([
    db.prepare(
      `SELECT id, name, location, description, ers_status, ers_phase
         FROM facilities WHERE company_id = ?
        ORDER BY ers_status = 'live' DESC, ers_phase, name`
    ).bind(user.company_id),
    db.prepare(
      `SELECT r.reference, r.kind, r.serial, r.needed_by, r.status, r.created_at, f.name AS facility
         FROM account_requests r JOIN facilities f ON f.id = r.facility_id
        WHERE r.company_id = ?
        ORDER BY r.created_at DESC LIMIT 50`
    ).bind(user.company_id)
  ]);
  return {
    user: { email: user.email, name: user.name, role: user.role },
    company: { name: user.company_name },
    facilities: facilities.results,
    requests: requests.results
  };
}

export async function handleAccountApi(request, env) {
  const db = env.ACCOUNTS;
  if (!db) return json({ error: 'The account portal is not provisioned on this deployment.' }, 503);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: 'Cross-site request refused.' }, 403);
  }

  if (path === '/api/account/session') {
    if (method === 'DELETE') {
      await A.closeSession(db, request, COOKIE);
      return json({ ok: true }, 200, { 'set-cookie': A.clearCookie(COOKIE) });
    }
    if (method !== 'POST') return json({ error: 'Use POST to sign in, DELETE to sign out.' }, 405);

    const key = `${SITE}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
    if (await A.throttled(db, key)) return json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, 429);
    const input = await body(request);
    const user = await A.authenticate(db, input.email, input.password);
    if (!user) {
      await A.recordFailure(db, key);
      return json({ error: 'That email and password do not match an account.' }, 401);
    }
    await A.clearFailures(db, key);
    if (pending(user)) {
      return json({
        error: 'Finish first-time setup on erektor-return.systems before using the support portal.',
        setup: SETUP_URL
      }, 403);
    }
    const setCookie = await A.openSession(db, user.id, SITE, COOKIE, !!input.remember);
    return json({ ok: true }, 200, { 'set-cookie': setCookie });
  }

  const user = await A.currentUser(db, request, SITE, COOKIE);
  if (!user) return json({ error: 'Sign in first.' }, 401);

  if (path === '/api/account/me' && method === 'GET') {
    return json(await overview(db, user));
  }

  if (path === '/api/account/requests' && method === 'POST') {
    const input = await body(request);
    const kind = KINDS[input.kind];
    if (!kind) return json({ error: 'Choose maintenance or an emergency replacement.' }, 400);

    const facility = await db.prepare('SELECT id, name, location, ers_status FROM facilities WHERE id = ? AND company_id = ?')
      .bind(Number(input.facility_id), user.company_id).first();
    if (!facility) return json({ error: 'Choose one of your facilities.' }, 400);

    const serial = normalise(input.serial);
    if (!valid(kind.identity, serial)) {
      return json({ error: `Enter the ${kind.identity} serial, for example ${EXAMPLE[kind.identity]}.` }, 400);
    }

    const neededBy = text(input.needed_by, 10);
    if (neededBy && !/^\d{4}-\d{2}-\d{2}$/.test(neededBy)) return json({ error: 'Enter the date as YYYY-MM-DD.' }, 400);
    const details = text(input.details, 2000);
    if (details.length < 10) return json({ error: 'Describe what is needed in a sentence or two.' }, 400);
    const contact = text(input.contact, 120);
    if (input.kind === 'emergency' && contact.length < 7) {
      return json({ error: 'Give a phone number the dispatcher can reach on site.' }, 400);
    }

    const ref = reference(kind.prefix);
    await db.prepare(
      `INSERT INTO account_requests
         (reference, company_id, facility_id, user_id, kind, serial, needed_by, contact, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(ref, user.company_id, facility.id, user.id, input.kind, serial, neededBy || null, contact, details).run();
    await notify(env, {
      reference: ref,
      kind: input.kind,
      company: user.company_name,
      facility: facility.name,
      facilityLocation: facility.location,
      ersStatus: facility.ers_status,
      serial,
      neededBy,
      contact,
      details,
      filedBy: user.email
    });
    return json({ reference: ref }, 201);
  }

  return json({ error: 'No such endpoint.' }, 404);
}

export async function serveAccount(request, env) {
  if (!env.ACCOUNTS) {
    return new Response('The account portal is not provisioned on this deployment.\n', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  const url = new URL(request.url);
  const user = await A.currentUser(env.ACCOUNTS, request, SITE, COOKIE);

  if (OPEN_PAGE.test(url.pathname)) {
    if (user) return Response.redirect(new URL('/account/index.html', url).toString(), 302);
  } else if (!user) {
    return new Response(null, {
      status: 302,
      headers: {
        location: '/account/signin.html?next=' + encodeURIComponent(url.pathname),
        'cache-control': 'no-store'
      }
    });
  }

  const asset = await env.ASSETS.fetch(request);
  const out = new Response(asset.body, asset);
  out.headers.set('cache-control', 'private, no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  return out;
}
