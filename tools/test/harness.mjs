/**
 * Boots src/index.js with a real SQLite registry and the repo's own assets,
 * so a test drives the Worker exactly as the edge does: same routing, same
 * gate, same data/lifecycle.json.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeD1 } from './d1.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const env = {
  REGISTRY: makeD1(join(ROOT, 'migrations', '0001_registry.sql')),
  ASSETS: {
    async fetch(input) {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      let path = new URL(href).pathname;
      if (path.endsWith('/')) path += 'index.html';
      try { return new Response(readFileSync(join(ROOT, path), 'utf8'), { status: 200 }); }
      catch { return new Response('not found', { status: 404 }); }
    }
  },
  REGISTRY_SECRET: 'test-only-secret',
  REGISTRY_ACCESS: JSON.stringify([
    { code: 'admincode', id: 'em', name: 'E Mellon', role: 'admin' },
    { code: 'readonly', id: 'ro', name: 'Reader', role: 'viewer' }
  ])
};

const { default: worker } = await import(join(ROOT, 'src', 'index.js'));
const ORIGIN = 'https://erektor.support';

let cookie = '';
export const clearCookie = () => { cookie = ''; };

async function send(method, path, headers, body) {
  const res = await worker.fetch(new Request(ORIGIN + path, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  }), env);
  const type = res.headers.get('content-type') || '';
  return {
    status: res.status,
    headers: res.headers,
    body: type.includes('json') ? await res.json().catch(() => null) : await res.text()
  };
}

/** A request as the console makes it: session cookie carried, same origin. */
export async function call(method, path, body, opts = {}) {
  const headers = { origin: ORIGIN };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie && !opts.anon) headers.cookie = cookie;
  const res = await send(method, path, headers, body);
  const set = res.headers.get('set-cookie');
  if (set && !opts.anon) cookie = set.split(';')[0];
  return res;
}

/** A request with headers set by hand — forged cookies, cross-site writes. */
export const raw = (method, path, headers = {}, body) =>
  send(method, path, { origin: ORIGIN, ...(body !== undefined && { 'content-type': 'application/json' }), ...headers }, body);

let pass = 0, fail = 0;
export function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + label); return; }
  fail++;
  console.log('  FAIL ' + label + (detail !== undefined ? '\n         got ' + JSON.stringify(detail) : ''));
}
export function group(name) { console.log('\n' + name); }
export function report() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
