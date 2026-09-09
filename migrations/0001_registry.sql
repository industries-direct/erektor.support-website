-- EREKTOR leg registry — initial schema.
--
--   wrangler d1 migrations apply erektor-registry --remote
--
-- Two tables and a spillway.
--
-- `legs` is a projection: the current state of each frame, cheap to filter and
-- sort for the console. `leg_events` is the truth: append-only, never updated,
-- never deleted. Every write in src/registry.js appends an event and updates
-- the projection in one batch, so the projection can always be rebuilt from
-- the log if it drifts.
--
-- The primary key is the MECHANICAL serial. It is stamped into the frame and
-- permanent for the life of the leg, and wear, intervals, warranty and the
-- lease record accrue against it. The electronics serial is a *current
-- binding* held in a nullable, uniquely-indexed column: swapping a ClearCore
-- rewrites that column and appends an `electronics-swap` event. Keying on the
-- electronics serial instead would silently reset a leg's history at every
-- swap, which is the one mistake this schema exists to make impossible.

CREATE TABLE IF NOT EXISTS legs (
  mechanical_serial   TEXT PRIMARY KEY,          -- MX-24-08192 — identity
  electronics_serial  TEXT,                      -- EL-25-014873 — current binding, may be NULL
  variant             TEXT NOT NULL,             -- LEG-S | LEG-SH | LEG-E  (data/hardware.json)
  controller          TEXT,                      -- CC-0 | CC-1
  firmware            TEXT,                      -- version currently on the bound ClearCore
  state               TEXT NOT NULL,             -- data/lifecycle.json states
  stage               TEXT,                      -- station within `line`, else NULL
  holder              TEXT,                      -- facility or operator holding it
  location            TEXT,                      -- free text: site, depot, bay
  flag_code           TEXT,                      -- open ERS flag: fault code, e.g. SES-30
  flag_reference      TEXT,                      -- FLG-… from the public intake
  flag_raised_at      TEXT,
  motor_hours         REAL NOT NULL DEFAULT 0,   -- lifetime, against the frame
  hours_at_service    REAL NOT NULL DEFAULT 0,   -- reading when the last record closed
  built_at            TEXT,
  commissioned_at     TEXT,
  last_service_at     TEXT,                      -- last CLOSED service record
  last_seen_at        TEXT,                      -- last event of any kind — drives staleness
  batch               TEXT,                      -- manufacturing batch/work order
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

-- Field lookup goes through the electronics serial (it is what a controller
-- screen and a session roster show), so it has to resolve as fast as the key.
-- UNIQUE because two live legs cannot answer to the same ClearCore; NULLs are
-- distinct in SQLite, so any number of uncommissioned frames coexist.
CREATE UNIQUE INDEX IF NOT EXISTS legs_electronics ON legs(electronics_serial)
  WHERE electronics_serial IS NOT NULL;

CREATE INDEX IF NOT EXISTS legs_state    ON legs(state);
CREATE INDEX IF NOT EXISTS legs_variant  ON legs(variant);
CREATE INDEX IF NOT EXISTS legs_holder   ON legs(holder);
CREATE INDEX IF NOT EXISTS legs_flag     ON legs(flag_code) WHERE flag_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS legs_seen     ON legs(last_seen_at);

CREATE TABLE IF NOT EXISTS leg_events (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  mechanical_serial   TEXT NOT NULL REFERENCES legs(mechanical_serial) ON DELETE CASCADE,
  at                  TEXT NOT NULL,
  type                TEXT NOT NULL,             -- data/lifecycle.json events
  actor               TEXT NOT NULL,             -- operator id, or 'portal' when field-filed
  from_state          TEXT,
  to_state            TEXT,
  electronics_serial  TEXT,                      -- the binding AT THE TIME, not now
  fault_code          TEXT,
  reference           TEXT,                      -- FLG-… / DSP-… when it came from intake
  hours               REAL,
  detail              TEXT
);

CREATE INDEX IF NOT EXISTS events_leg ON leg_events(mechanical_serial, id DESC);
CREATE INDEX IF NOT EXISTS events_at  ON leg_events(at DESC);

-- The spillway. A flag or dispatch filed in the field against a serial with no
-- registry record has nowhere to land, and dropping it is exactly the failure
-- the public intake is written to avoid. It goes here instead and the console
-- shows it as unmatched, so an unrecorded leg surfaces as a queue entry rather
-- than as silence.
CREATE TABLE IF NOT EXISTS orphan_intake (
  reference   TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  kind        TEXT NOT NULL,                     -- flag | dispatch
  identity    TEXT NOT NULL,                     -- mechanical | electronics
  serial      TEXT NOT NULL,
  fault_code  TEXT,
  payload     TEXT NOT NULL,                     -- the submitted fields, as JSON
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS orphan_open ON orphan_intake(at DESC) WHERE resolved_at IS NULL;

-- Sign-in throttle. Small, self-pruning, and deliberately in the same store as
-- everything else so the gate has no second dependency to be unavailable.
CREATE TABLE IF NOT EXISTS auth_attempts (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ip       TEXT NOT NULL,
  at       TEXT NOT NULL,
  ok       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS attempts_ip ON auth_attempts(ip, at DESC);
