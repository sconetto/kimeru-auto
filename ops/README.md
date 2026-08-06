# Operations — Kimeru Auto

Runbooks and operational procedures for running Kimeru Auto in production.

## Contents

- [Production Deployment](deploy.md) — step-by-step go-live runbook
- [Local Testing Environment](local-testing.md) — one-command local env + troubleshooting
- [FENABRAVE Monthly Import](fenabrave-import.md) — how to update sales rankings monthly
- [Rollback Procedure](rollback.md) — how to roll back a bad deployment
- [Incident Response](incident-response.md) — how to respond to production incidents

## Environment / Access

| System | Access |
|--------|--------|
| Vercel (hosting) | Owner account |
| Supabase (PostgreSQL) | Owner account |
| Upstash (Redis) | Owner account |
| Sentry (errors) | Owner account |
| GitHub Actions (CI/CD) | Repo maintainers |
| Admin panel | `/admin` — seeded admin account |

## Weekly / Monthly Cadence

| When | Action |
|------|--------|
| Monthly (2nd) | FIPE sync cron runs automatically (GitHub Actions) |
| Monthly (5th–10th) | FENABRAVE import — see [runbook](fenabrave-import.md) |
| Weekly (Mon) | Security audit cron (npm audit + Semgrep) |
| Weekly (Mon) | Review Dependabot PRs |
