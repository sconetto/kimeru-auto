-- The FENABRAVE sync now creates placeholder models (and brands) for report
-- rows that match nothing in the catalog. The `fipe_sync` Actions role only had
-- the blanket SELECT that migration 0014 granted, so the insert failed with
-- "permission denied for table models" — after the report had downloaded and
-- parsed successfully.
--
-- Guarded on role existence so local/dev databases (which only have `postgres`)
-- migrate without error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fipe_sync') THEN
    EXECUTE 'GRANT INSERT ON models TO fipe_sync';
    EXECUTE 'GRANT INSERT ON brands TO fipe_sync';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE models_id_seq TO fipe_sync';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE brands_id_seq TO fipe_sync';
  END IF;
END $$;
