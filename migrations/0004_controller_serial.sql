-- The serial stamped on a leg's controller.
--
--   wrangler d1 migrations apply erektor-registry --remote
--
-- A controller carries its own stamped serial, (model)-(build sequence), e.g.
-- CC1-00123 (data/hardware.json serialFormats.controller). Like the electronics
-- serial it belongs to the controller, not the frame, so it is a current
-- binding: an electronics swap that fits a different ClearCore rewrites it.
-- UNIQUE because one controller cannot be fitted to two legs; NULL for a bare
-- frame or a controller whose stamp has not been recorded.
ALTER TABLE legs ADD COLUMN controller_serial TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS legs_controller_serial ON legs(controller_serial)
  WHERE controller_serial IS NOT NULL;

-- The binding at the time of each event, as leg_events already keeps for the
-- electronics serial.
ALTER TABLE leg_events ADD COLUMN controller_serial TEXT;
