-- The `fipe_sync` GitHub Actions role is the least-privilege DB user shared by
-- the monthly FIPE and FENABRAVE syncs. Migration 0014 gave it SELECT on every
-- table, but the FENABRAVE sync also *writes* to `sales_rankings`:
--
--   insert into "sales_rankings" ... on conflict ("model_id","month","year")
--   do update set ...
--
-- Without INSERT/UPDATE the job downloads and parses the report correctly and
-- then fails with "permission denied for table sales_rankings", which is only
-- visible through the Drizzle error cause.
--
-- Guarded on role existence so local/dev databases (which only have `postgres`)
-- migrate without error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fipe_sync') THEN
    EXECUTE 'GRANT INSERT, UPDATE ON sales_rankings TO fipe_sync';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE sales_rankings_id_seq TO fipe_sync';
  END IF;
END $$;
