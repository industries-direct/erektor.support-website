-- The customer that bought a leg.
--
--   wrangler d1 migrations apply erektor-registry --remote
--
-- The id of a row in ers-accounts.companies, which lives in a different D1
-- database, so it cannot be a foreign key. This, not facility_id, decides
-- whose account a leg appears on (src/portal.js): a leg sold to one customer
-- can sit at, or pass through, another customer's facility, and that
-- customer must never see it or its serials. NULL means industries.direct
-- owns it (never sold, or not yet assigned), which is every existing leg;
-- such a leg appears on no customer's account.
ALTER TABLE legs ADD COLUMN owner_company_id INTEGER;
CREATE INDEX IF NOT EXISTS legs_owner ON legs(owner_company_id) WHERE owner_company_id IS NOT NULL;
