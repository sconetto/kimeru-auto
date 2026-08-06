# Rollback Procedure

How to roll back a bad deployment quickly and safely.

## When

- A production incident is traced to a recent deployment
- Deployment monitoring (Sentry, uptime) shows elevated errors
- Manual verification fails post-deploy

## Immediate Rollback (Vercel)

1. Open the Vercel project dashboard → **Deployments**
2. Find the last known-good deployment
3. Click the **⋮ menu** → **Promote to Production**
4. Verify:
   - Home page loads (smoke test)
   - Admin login works
   - No new Sentry errors

**Time to restore: ~2 minutes.**

## Database Rollback

Schema migrations are additive (Drizzle-generated). If a migration caused
issues:

1. **Do NOT** run `drizzle-kit migrate` with the bad migration in a new env
2. Supabase: use the **Database backups** section to restore a point-in-time
   snapshot if data was corrupted
3. Data-only issues (bad FIPE sync, bad FENABRAVE import):
   - FIPE: re-run `npm run fipe:sync` with correct env
   - FENABRAVE: re-import the previous month's correct file

## Code Rollback

1. `git revert <bad-commit>` or checkout the last good tag
2. Push to `main` — CI runs, Vercel auto-deploys
3. Run smoke tests

## Prevention

- Every deploy goes through CI: lint → typecheck → test → build
- E2E tests run on every PR
- Migration changes are reviewed before merge
