# Production Deployment Runbook

Steps to deploy Kimeru Auto to production. Follow in order — each step
unlocks the next. **Requires credentials from the repo owner** (marked ⛔).

## Prerequisites (one-time)

| # | Item | Needed For | Status |
|---|------|-----------|--------|
| 1 | Vercel project (`kimeru-auto`) on team `jsconetto-vercel` | Hosting | 🔒 owner action |
| 2 | Supabase production project + service key | PostgreSQL | 🔒 owner action |
| 3 | Upstash Redis REST URL + token | Caching / rate limits | 🔒 owner action |
| 4 | Custom domain (e.g. `kimeruauto.com.br`) | Brand | 🔒 owner decision |
| 5 | Sentry project + DSN | Error monitoring | 🔒 owner action |
| 6 | BetterStack or Checkly account | Uptime monitoring | 🔒 owner action |

## Step 1 — Fix Supabase access (⛔ 15.2)

The MCP connection to `https://izmhriusbecwmftozefq.supabase.co` is broken:
`password authentication failed for user "postgres"` and
`supabase_read_only_user`. Fix one of:

- **Option A (recommended)**: Reset the DB password in Supabase dashboard →
  Database → Connection string → copy the new URL into the MCP config and
  `DATABASE_URL` env var.
- **Option B**: Provide the service-role key so migrations can run via
  `supabase_apply_migration`.

Then apply migrations:

```bash
DATABASE_URL="postgresql://postgres:<new-pass>@<project-ref>.supabase.co:5432/postgres" \
  npx drizzle-kit migrate
```

## Step 2 — Configure production env vars (⛔ 15.1)

> **Note**: Public pages degrade gracefully without a DB — the build
> succeeds and renders empty states until `DATABASE_URL` is set (verified:
> `next build` exits 0 with no DB). This means the app can be deployed
> *before* the database is provisioned; data appears after env vars are
> configured and ISR revalidates.

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct connection string (migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `FIPE_API_TOKEN` | FIPE parallelum token (optional, raises 500→1000 req/day) |
| `UPSTASH_REDIS_REST_URL` | From Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash console |
| `YOUTUBE_API_KEY` | Google Cloud console |
| `OPENAI_API_KEY` | OpenAI console (or `ANTHROPIC_API_KEY`) |
| `NEXT_PUBLIC_APP_URL` | Production URL |

## Step 3 — Seed production admin + reference data

After migrations run against Supabase:

```bash
DATABASE_URL="<prod-url>" npm run db:seed
```

⚠️ Change `ADMIN_PASSWORD` in the seed env before running.

## Step 4 — Deploy to Vercel (⛔ 15.4)

```bash
npx vercel link          # link to kimeru-auto project
npx vercel --prod        # production deploy
```

CI/CD is already wired: pushes to `main` deploy via GitHub Actions →
Vercel (see `.github/workflows/`).

## Step 5 — Domain + SSL (⛔ 15.5)

- Vercel → Project → Settings → Domains → add `kimeruauto.com.br`
- Point DNS (A/ALIAS to `76.76.21.21` or CNAME to `cname.vercel-dns.com`)
- SSL auto-provisions; verify `https://` works on the apex + `www`

## Step 6 — Monitoring (⛔ 15.6, 15.7, 15.8)

- **Sentry**: install `@sentry/nextjs` (`npx @sentry/wizard@latest -i nextjs`),
  set `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` in Vercel.
- **Vercel Analytics**: enable in Project → Analytics (free tier).
- **Uptime**: BetterStack — create monitors for `/` and `/pt-BR/financiamento`,
  alert on >2 consecutive failures.

## Step 7 — Backups (⛔ 16.6)

Supabase → Database → Backups → enable **Continuous backups** (7-day PITR).
Optionally add a weekly GitHub Action that exports `pg_dump` to a private
repo/R2 bucket.

## Step 8 — Smoke tests (⛔ 15.9)

```bash
BASE_URL="https://kimeruauto.com.br" npx playwright test tests/e2e/public-journeys.spec.ts
```

Verify: home 200, car page 200, compare renders, financing calculates,
admin login works with seeded credentials.

## Rollback

See [ops/rollback.md](rollback.md).
