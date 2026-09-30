-- EREKTOR manufacturing — batches, materials, purchase orders, time.
--
--   wrangler d1 migrations apply erektor-registry --remote
--
-- Same database as the leg registry, on purpose: a batch is the run that put
-- frames INTO the registry, and every metric worth having joins the two — a
-- batch's first-pass yield against how many of its legs came back from the
-- field inside ninety days.
--
-- The stock follows the registry's own rule. `materials.on_hand` is a
-- projection; `material_moves` is the truth, append-only. Every write appends
-- a move and updates the projection in one batch, so a disputed count can be
-- rebuilt from the log.

CREATE TABLE IF NOT EXISTS batches (
  batch_number    TEXT PRIMARY KEY,              -- B-2609-A — also legs.batch on every frame it built
  variant         TEXT NOT NULL,                 -- LEG-S | LEG-SH | LEG-E  (data/hardware.json)
  first_serial    TEXT NOT NULL,                 -- L-V3BE201
  frame_count     INTEGER NOT NULL,
  stage           TEXT NOT NULL,                 -- assembly | qa | commissioning | released
  lots            TEXT,                          -- material lots used, free text
  qa_inspected    INTEGER,                       -- frames through QA
  qa_first_pass   INTEGER,                       -- of those, passed without rework
  started_at      TEXT NOT NULL,                 -- assembly begins when the batch is logged
  qa_at           TEXT,                          -- each stage stamps when it was entered, so
  commissioning_at TEXT,                         -- cycle time splits by stage without a log
  released_at     TEXT,
  created_by      TEXT NOT NULL,
  notes           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS batches_stage ON batches(stage);

CREATE TABLE IF NOT EXISTS materials (
  sku             TEXT PRIMARY KEY,              -- CC-1, BRK-U2, XBEE, PACK-56V …
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'each',
  on_hand         REAL NOT NULL DEFAULT 0,       -- projection of material_moves
  reorder_at      REAL NOT NULL DEFAULT 0,
  per_leg         REAL NOT NULL DEFAULT 0,       -- consumed per frame built, 0 = not on the leg BOM
  supplier        TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS material_moves (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sku             TEXT NOT NULL REFERENCES materials(sku) ON DELETE CASCADE,
  at              TEXT NOT NULL,
  delta           REAL NOT NULL,                 -- + received, − used
  reason          TEXT NOT NULL,                 -- received | used | count
  reference       TEXT,                          -- batch number or PO reference
  actor           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS moves_sku ON material_moves(sku, at DESC);

CREATE TABLE IF NOT EXISTS purchase_orders (
  reference       TEXT PRIMARY KEY,              -- PO-20260928-A1B2
  status          TEXT NOT NULL,                 -- draft | approved | received | cancelled
  needed_by       TEXT,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  approved_by     TEXT,
  approved_at     TEXT,
  received_at     TEXT
);

CREATE TABLE IF NOT EXISTS po_lines (
  reference       TEXT NOT NULL REFERENCES purchase_orders(reference) ON DELETE CASCADE,
  sku             TEXT NOT NULL REFERENCES materials(sku),
  qty             REAL NOT NULL,
  PRIMARY KEY (reference, sku)
);

-- One row per stretch on the clock. An open row (clock_out NULL) is someone
-- on the floor now; at most one per member, which the partial index enforces
-- so a double tap on "Clock in" cannot open two.
CREATE TABLE IF NOT EXISTS time_entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  member          TEXT NOT NULL,                 -- operator id from REGISTRY_ACCESS
  member_name     TEXT NOT NULL,
  clock_in        TEXT NOT NULL,
  clock_out       TEXT,
  batch_number    TEXT,                          -- NULL = not batch work
  activity        TEXT,
  entered_by      TEXT NOT NULL                  -- differs from member for a lead's correction
);

CREATE UNIQUE INDEX IF NOT EXISTS time_open ON time_entries(member) WHERE clock_out IS NULL;
CREATE INDEX IF NOT EXISTS time_in    ON time_entries(clock_in);
CREATE INDEX IF NOT EXISTS time_batch ON time_entries(batch_number);
