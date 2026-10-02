-- The `fipe_sync` GitHub Actions role (least-privilege DB user used by the
-- monthly FIPE sync) has its grants applied outside drizzle. When migration
-- 0012 created `model_versions`, the role never received access, so the monthly
-- job failed with "permission denied for table model_versions".
--
-- This migration (a) backfills the reader grants and (b) sets default
-- privileges so tables/sequences created by future migrations inherit them —
-- the sync can no longer silently lose access to new reference tables.
--
-- Guarded on role existence so local/dev databases (which only have `postgres`)
-- migrate without error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fipe_sync') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA public TO fipe_sync';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO fipe_sync';
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fipe_sync';

    -- Write access the sync actually needs (kept explicit / least-privilege).
    EXECUTE 'GRANT UPDATE ON model_years TO fipe_sync';
    EXECUTE 'GRANT INSERT, UPDATE ON fipe_history TO fipe_sync';

    -- Future-proof: objects created by postgres (the migration role) inherit
    -- these grants so a new reference table can't break the sync again.
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO fipe_sync';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fipe_sync';
  END IF;
END $$;
