-- The slice of ers-accounts the portal reads. The schema is owned by
-- erektor-return.systems (its migrations/); this mirrors the columns used here.
CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE users (
  id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT,
  role TEXT NOT NULL DEFAULT 'member', pw_hash TEXT NOT NULL DEFAULT '', pw_salt TEXT NOT NULL DEFAULT '',
  pw_iter INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0,
  setup_completed_at TEXT, tour_completed_at TEXT
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, site TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE facilities (
  id INTEGER PRIMARY KEY, company_id INTEGER NOT NULL, name TEXT NOT NULL, location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', ers_status TEXT NOT NULL DEFAULT 'live', ers_phase INTEGER
);
CREATE TABLE account_requests (
  reference TEXT PRIMARY KEY, company_id INTEGER, facility_id INTEGER, user_id INTEGER, kind TEXT, serial TEXT,
  needed_by TEXT, contact TEXT, details TEXT, status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
