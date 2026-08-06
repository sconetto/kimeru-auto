# Security Policy

## Reporting a Vulnerability

We take the security of Kimeru Auto seriously. If you believe you have found a
security vulnerability, please report it to us as soon as possible.

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:
**[work@sconetto.me](mailto:work@sconetto.me)**

You should receive a response within 48 hours. If for some reason you do not,
please follow up via email to ensure we received your original message.

### What to include

To help us triage and respond efficiently, please include:

- The type of issue (e.g., XSS, SQL injection, CSRF, data exposure)
- The affected versions and components
- Full paths of source file(s) related to the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue (what an attacker might be able to do)

## Security Best Practices for Contributors

- Never commit secrets, API keys, or tokens to the repository
- Use the `.env.example` template and keep real values out of version control
- Run `npm audit` before merging dependency updates
- Follow the least-privilege principle when granting database or admin access
- Sanitize all user input and validate all external data (FIPE, FENABRAVE)

## Known Dependency Findings (as of 2026-08)

| Package | Severity | Issue | Status |
|---------|----------|-------|--------|
| `xlsx` (SheetJS npm) | high | Prototype pollution + ReDoS (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) | No npm fix — only used for authenticated admin FENABRAVE imports; file size + content validated before parse. Tracked for replacement with the SheetJS CDN build or `exceljs`. |
| `postcss` (via Next.js) | high | XSS in stringify output (GHSA-qx2v-qp2m-jg93) | Build-time only; fixed by upgrading to Next.js 16 (breaking). Scheduled upgrade. |
| `sharp` (via Next.js) | high | libvips CVEs | Fixed by Next.js 16 upgrade. |

**Policy**: `npm audit` runs weekly in CI. High-severity findings in the
runtime dependency tree must be resolved before production launch or
explicitly risk-accepted here.
