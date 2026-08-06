# Local Testing Environment

Kimeru Auto ships a one-command local environment that mirrors production
versions so tests predict real behavior.

## Quick Start

```bash
npm install
npm run setup:local   # compose up → .env.local → migrate → seed
npm run dev           # or: npm run test:e2e
```

`npm run setup:local` is **idempotent** — re-running is always safe.

## What It Sets Up

| Service   | Image             | Port   | Purpose                         |
| --------- | ----------------- | ------ | ------------------------------- |
| Postgres  | `postgres:17-alpine` | 55432  | App database (matches prod + CI)  |
| Redis     | `redis:7-alpine`    | 56379  | Cache (optional — in-memory fallback) |

- `.env.local` is **generated** from `.env.example` on first run (random
  `AUTH_SECRET` + admin password). Existing files are never overwritten.
- Migrations + seed run automatically.

## Version Parity

| Environment | Postgres | Redis       |
| ----------- | -------- | ----------- |
| Local       | 17       | 7           |
| CI          | 17       | —           |
| Production (Supabase) | 17 | Upstash (managed) |

Tests run against the same Postgres major version everywhere, so a green
local suite is a strong signal for CI and production.

## Testing Commands

| Command             | What it runs                          |
| ------------------- | ------------------------------------- |
| `npm run test`      | Vitest unit + integration (no DB needed) |
| `npm run test:e2e`  | Playwright E2E (needs seeded DB)      |
| `npm run test:coverage` | Vitest with coverage report        |

The E2E suite boots `npm run dev` automatically (see `playwright.config.ts`),
so `npm run setup:local` once is enough before any test run.

**Reliability**: the Playwright config caps local workers at 2 with 1 retry.
This avoids flaky timeouts from Next.js dev-mode on-demand compilation under
parallel load. CI uses 1 worker + 2 retries. If you see intermittent E2E
failures, re-run — then check the dev server isn't overloaded.

## Troubleshooting

### Port already in use (55432 or 56379)

Another project is using the port. Either stop that process, or change the
host port in `docker-compose.yml` **and** update the matching URL in
`scripts/setup-local.mjs`.

### Containers exist but unhealthy

```bash
docker compose ps          # check status
docker compose logs postgres
docker compose restart
```

If the Postgres data volume is corrupted:

```bash
docker compose down -v     # ⚠️ destroys local data
npm run setup:local        # fresh start
```

### Seed fails with duplicate/unknown errors

```bash
npm run db:seed            # idempotent — re-run is safe
```

### Stale containers from an older setup (pre-compose)

Earlier setups used a bare `docker run` container named `kimeru-auto-pg` on
port 55432. If compose reports a name conflict:

```bash
docker rm -f kimeru-auto-pg
npm run setup:local
```

### Environment variables seem wrong

`.env.local` is only generated when missing. To regenerate from scratch:

```bash
mv .env.local .env.local.bak
npm run setup:local
```

## Future: Full Supabase Parity

The app currently uses **zero Supabase-specific features** (auth is NextAuth,
DB access is Drizzle → raw SQL), so plain Postgres is a faithful local
stand-in. If Supabase Auth / Storage / RLS are adopted later, switch local
dev to the full Supabase stack for production parity:

```bash
supabase start          # Postgres 17 + Auth + Storage + Realtime + Studio
# point DATABASE_URL at the local Supabase port (default 54322)
```

Until then, the compose setup above is the canonical local environment.
