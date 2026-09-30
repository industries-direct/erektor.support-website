/**
 * Accounts over the shared ers-accounts D1 database.
 *
 * Mirrored from src/auth.js in the erektor-return.systems repo; keep the two
 * identical. The same user row and password sign in on both sites, with a
 * separate session per site because they are separate origins.
 *
 * Passwords are PBKDF2-SHA256 at 100,000 iterations, the most Workers' Web
 * Crypto allows. Session tokens are random; only their SHA-256 is stored, so
 * a read of the database does not yield a usable cookie.
 */

const enc = new TextEncoder();
export const PBKDF2_ITERATIONS = 100000;
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function b64(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** Compares digests, so the comparison time does not depend on where they differ. */
async function same(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function derive(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations },
    key,
    256
  );
  return b64(bits);
}

export async function hashPassword(password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, iterations: PBKDF2_ITERATIONS, hash: await derive(password, salt, PBKDF2_ITERATIONS) };
}

export async function verifyPassword(user, password) {
  return same(await derive(password, user.pw_salt, user.pw_iter), user.pw_hash);
}

/** Why a new password is refused, or '' when it is acceptable. */
export function passwordProblem(next, current) {
  if (typeof next !== 'string' || next.length < 12) return 'Use at least 12 characters.';
  if (next.length > 128) return 'Use at most 128 characters.';
  if (next === current) return 'Choose a password different from the current one.';
  return '';
}

/* ------------------------------------------------------------ cookies */

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function cookie(name, value, maxAge) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function clearCookie(name) {
  return cookie(name, '', 0);
}

/* ----------------------------------------------------------- sessions */

/** Opens a session and returns the Set-Cookie header value for it. */
export async function openSession(db, userId, site, cookieName, remember) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const seconds = remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600;
  const expires = new Date(Date.now() + seconds * 1000).toISOString();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()),
    db.prepare('INSERT INTO sessions (token_hash, user_id, site, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256(token), userId, site, expires)
  ]);
  return cookie(cookieName, token, remember ? seconds : null);
}

/** The signed-in user with their company, or null. */
export async function currentUser(db, request, site, cookieName) {
  const token = readCookie(request, cookieName);
  if (!token) return null;
  const row = await db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.company_id, u.must_change_password,
            u.setup_completed_at, u.tour_completed_at, u.pw_hash, u.pw_salt, u.pw_iter,
            c.name AS company_name, s.token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       JOIN companies c ON c.id = u.company_id
      WHERE s.token_hash = ? AND s.site = ? AND s.expires_at > ?`
  ).bind(await sha256(token), site, new Date().toISOString()).first();
  return row || null;
}

export async function closeSession(db, request, cookieName) {
  const token = readCookie(request, cookieName);
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

/* ----------------------------------------------------------- throttle */

export async function throttled(db, key) {
  const row = await db.prepare('SELECT failures, window_start FROM login_attempts WHERE key = ?').bind(key).first();
  return !!row && Date.now() - row.window_start < WINDOW_MS && row.failures >= MAX_FAILURES;
}

export async function recordFailure(db, key) {
  const now = Date.now();
  await db.prepare(
    `INSERT INTO login_attempts (key, failures, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         failures = CASE WHEN ?2 - window_start < ?3 THEN failures + 1 ELSE 1 END,
         window_start = CASE WHEN ?2 - window_start < ?3 THEN window_start ELSE ?2 END`
  ).bind(key, now, WINDOW_MS).run();
}

export async function clearFailures(db, key) {
  await db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run();
}

/* -------------------------------------------------------------- login */

/**
 * Checks an email and password. Returns the user row, or null with the same
 * answer for an unknown email and a wrong password.
 */
export async function authenticate(db, email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) return null;
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim()).first();
  if (!user) {
    // Spend the same time as a real check so timing does not reveal which emails exist.
    await derive(password, 'AAAAAAAAAAAAAAAAAAAAAA==', PBKDF2_ITERATIONS);
    return null;
  }
  return (await verifyPassword(user, password)) ? user : null;
}
