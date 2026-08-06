# Incident Response Runbook

How to detect, respond to, and learn from production incidents.

## Severity Levels

| Level | Definition | Response |
|-------|------------|----------|
| **SEV-1** | Site down, data loss, security breach | Immediate, all-hands |
| **SEV-2** | Major feature broken, degraded performance | Within 1 hour |
| **SEV-3** | Minor bug, cosmetic issue | Next business day |

## Detection

- **Sentry**: error rate alerts (set threshold at 1% error rate)
- **Uptime monitor** (BetterStack/Checkly): page availability checks
- **Vercel Analytics**: Web Vitals regression alerts
- **Weekly security audit** (CI): dependency findings

## Response Flow

### 1. Triage (0–5 min)

- Confirm severity (SEV-1/2/3)
- Check Sentry for error clusters
- Check uptime monitor status
- Note affected pages/routes

### 2. Mitigate (5–30 min)

- **SEV-1**: Execute [rollback](rollback.md) immediately if a deploy is suspected
- Isolate the failing component (FIPE API down? DB slow? Auth broken?)
- For external API failures (FIPE/FENABRAVE): the app serves cached data by
  design — verify cache fallbacks are working

### 3. Resolve

- Fix the root cause (not the symptom)
- Deploy via normal CI/CD flow
- Verify with smoke tests

### 4. Post-incident (within 3 days)

- Write a blameless post-mortem: timeline, root cause, impact, action items
- Add a regression test if applicable
- Update runbooks with lessons learned

## Known External Dependencies

| Dependency | Failure Mode | Fallback |
|------------|--------------|----------|
| FIPE API (parallelum) | Rate limit / downtime | Redis cache (1h TTL) + stale-while-error |
| FENABRAVE | Monthly report delay | Previous month's data stays visible |
| YouTube API | Transcript fetch fail | Editorial pipeline surfaces typed error |
| LLM API | Timeout | 60s timeout + error surfaced to admin |

## Contact

- Primary: repo owner (work@sconetto.me)
- All incidents logged in GitHub Issues with `incident` label
