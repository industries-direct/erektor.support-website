/**
 * The gate on /internal/* and /api/registry/*.
 *
 * The public portal degrades OPEN: if the intake API is unreachable an
 * operator still walks away with a reference number, because a leg that has
 * stopped is not the moment to lose a request. This gate degrades CLOSED. An
 * unconfigured registry serves nothing at all, so a half-provisioned deploy
 * cannot publish the fleet.
 *
 * Two secrets, both required:
 *
 *   REGISTRY_SECRET   HMAC key for session cookies. Any long random string.
 *   REGISTRY_ACCESS   JSON array of operators:
 *                     [{"code":"…","id":"em","name":"E Mellon","role":"admin"}]
 *
 * Roles come from data/lifecycle.json: viewer reads, operator writes, admin
 * additionally retires and deletes.
 *
 * This is one enforcement point, not two, and it is meant to sit BEHIND
 * Cloudflare Access rather than instead of it — see the registry section of
 * README.md. Access gives SSO and an audit trail at the edge; this makes the
 * section non-public on its own, from day one, with nothing to configure in a
 * dashboard.
 */

const COOKIE = 'ers_reg';
const TTL_SECONDS = 12 * 60 * 60;   // one shift
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const enc = new TextEncoder();

/* ------------------------------------------------------------ encoding */

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Length-independent equality. Compares digests, so unequal lengths are safe. */
async function sameSecret(a, b) {
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b))
  ]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

/* -------------------------------------------------------------- config */

/**
 * Read the gate's configuration. Returns null when the registry is not
 * provisioned, which every caller treats as "serve nothing".
 */
export function gateConfig(env) {
  if (!env.REGISTRY_SECRET || !env.REGISTRY_ACCESS) return null;
  let operators;
  try {
    operators = JSON.parse(env.REGISTRY_ACCESS);
  } catch {
    console.error('REGISTRY_ACCESS is not valid JSON — the gate stays shut.');
    return null;
  }
  if (!Array.isArray(operators) || !operators.length) return null;
  return { secret: env.REGISTRY_SECRET, operators };
}

/* ------------------------------------------------------------ sessions */

let keyCache = null;
async function hmacKey(secret) {
  if (!keyCache || keyCache.secret !== secret) {
    keyCache = {
      secret,
      key: await crypto.subtle.importKey(
        'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      )
    };
  }
  return keyCache.key;
}

async function sign(payload, secret) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

async function mint(operator, secret) {
  const body = b64url(enc.encode(JSON.stringify({
    sub: operator.id,
    name: operator.name,
    role: operator.role || 'viewer',
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
  })));
  return body + '.' + await sign(body, secret);
}

/** Verify a cookie value. Returns the session, or null for anything wrong. */
async function open(token, secret) {
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const expected = await sign(body, secret);
  if (!(await sameSecret(token.slice(dot + 1), expected))) return null;
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(unb64url(body)));
  } catch {
    return null;
  }
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  return claims;
}

function cookieValue(request, name) {
  const jar = request.headers.get('cookie') || '';
  for (const part of jar.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function setCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * The session on this request, or null. Callers decide what to do about null:
 * a page redirects to sign-in, an API answers 401.
 */
export async function sessionFor(request, env) {
  const cfg = gateConfig(env);
  if (!cfg) return null;
  const token = cookieValue(request, COOKIE);
  return token ? open(token, cfg.secret) : null;
}

export const canWrite = (s) => !!s && (s.role === 'operator' || s.role === 'admin');
export const isAdmin = (s) => !!s && s.role === 'admin';

/* -------------------------------------------------------------- throttle */

const ip = (request) => request.headers.get('cf-connecting-ip') || 'unknown';

async function recentFailures(env, addr) {
  if (!env.REGISTRY) return 0;
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = await env.REGISTRY
    .prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE ip = ? AND ok = 0 AND at > ?')
    .bind(addr, since).first();
  return (row && row.n) || 0;
}

async function noteAttempt(env, addr, ok) {
  if (!env.REGISTRY) return;
  const now = new Date().toISOString();
  // Prune on write: the table stays a window, not a log. The audit trail that
  // matters is leg_events, which records who did what to which leg.
  await env.REGISTRY.batch([
    env.REGISTRY.prepare('INSERT INTO auth_attempts (ip, at, ok) VALUES (?, ?, ?)')
      .bind(addr, now, ok ? 1 : 0),
    env.REGISTRY.prepare('DELETE FROM auth_attempts WHERE at < ?')
      .bind(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);
}

/* -------------------------------------------------------------- handlers */

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });

/**
 * Reject a cross-site write. SameSite=Strict already keeps the cookie off
 * cross-origin requests; this makes a misconfigured browser or a future
 * relaxation of that attribute fail loudly rather than quietly.
 */
export function crossSite(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;                      // same-origin fetches may omit it
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

/** POST /api/registry/session — exchange an access code for a session. */
export async function signIn(request, env) {
  const cfg = gateConfig(env);
  if (!cfg) return json({ error: 'The registry is not provisioned on this deployment.' }, 503);
  if (crossSite(request)) return json({ error: 'Cross-site request refused.' }, 403);

  const addr = ip(request);
  if (await recentFailures(env, addr) >= MAX_FAILURES) {
    return json({ error: 'Too many attempts. Wait fifteen minutes.' }, 429, { 'retry-after': '900' });
  }

  let code = '';
  try {
    code = String((await request.json()).code || '').trim();
  } catch {
    return json({ error: 'Malformed JSON.' }, 400);
  }
  if (!code) return json({ error: 'Access code is required.' }, 422);

  // Every candidate is compared, so the response time does not narrow down
  // which operator a code belongs to.
  let matched = null;
  for (const op of cfg.operators) {
    if (await sameSecret(code, String(op.code || ''))) matched = matched || op;
  }

  await noteAttempt(env, addr, !!matched);
  if (!matched) return json({ error: 'That code was not recognised.' }, 401);

  const token = await mint(matched, cfg.secret);
  return json(
    { id: matched.id, name: matched.name, role: matched.role || 'viewer', expiresIn: TTL_SECONDS },
    200,
    { 'set-cookie': setCookie(token, TTL_SECONDS) }
  );
}

/** DELETE /api/registry/session */
export function signOut() {
  return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) });
}
