-- Which customer facility a leg is assigned to.
--
-- This is the id of a row in ers-accounts.facilities, a separate D1 database
-- shared with erektor-return.systems, so it cannot be a foreign key. It is what
-- puts a leg on a customer's account dashboard (src/portal.js); `holder` stays
-- the free-text custody note it always was.
ALTER TABLE legs ADD COLUMN facility_id INTEGER;
CREATE INDEX IF NOT EXISTS legs_facility ON legs(facility_id) WHERE facility_id IS NOT NULL;
