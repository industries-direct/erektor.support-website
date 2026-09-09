/**
 * A D1 stand-in over node:sqlite.
 *
 * The registry's contract with D1 is small — prepare/bind/first/all/run and
 * batch — so the whole thing can run against real SQLite in-process. That
 * matters more than it sounds: the interesting behaviour in src/registry.js is
 * SQL (the unique partial index on the electronics serial, the interval
 * arithmetic, the two-statement batch that keeps the projection in step with
 * the log), and none of it is exercised by a mock.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function makeD1(schemaPath) {
  const db = new DatabaseSync(':memory:');
  const sql = readFileSync(schemaPath, 'utf8')
    .split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) db.exec(stmt);

  const norm = (v) => (v === undefined ? null : v);
  function prepare(text) {
    let args = [];
    const api = {
      bind(...a) { args = a.map(norm); return api; },
      async first() { const r = db.prepare(text).get(...args); return r === undefined ? null : r; },
      async all() { return { results: db.prepare(text).all(...args), success: true }; },
      async run() { return { success: true, meta: db.prepare(text).run(...args) }; },
      _exec() {
        const s = db.prepare(text);
        if (/^\s*select/i.test(text)) return { results: s.all(...args) };
        s.run(...args);
        return { results: [] };
      }
    };
    return api;
  }

  return { prepare, async batch(list) { return list.map((s) => s._exec()); }, _raw: db };
}
