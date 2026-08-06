# Contributing to Kimeru Auto

First off, thanks for taking the time to contribute! 🚗

The following is a set of guidelines for contributing to Kimeru Auto. These are
mostly guidelines, not rules. Use your best judgment, and feel free to propose
changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Commit Style](#commit-style)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to
uphold this code. Please report unacceptable behavior to
[work@sconetto.me](mailto:work@sconetto.me).

## Getting Started

Kimeru Auto is a planning-first project. Before implementing a feature, the
intended behavior MUST be captured in an OpenSpec change proposal under
[`openspec/changes/`](openspec/changes/). This keeps the codebase aligned with
the documented product vision.

### Workflow

1. **Explore first** — use `/opsx-explore` to think through ideas before coding.
2. **Propose a change** — use `/opsx-propose` to create the formal proposal with
   design, specs, and tasks.
3. **Implement** — use `/opsx-apply` to work through the tasks once the proposal
   is approved.
4. **Archive** — use `/opsx-archive` to finalize a completed change.

## Development Setup

### Prerequisites

- Node.js >= 22 (we recommend using [nvm](https://github.com/nvm-sh/nvm) — see `.nvmrc`)
- pnpm, npm, or yarn (npm ships with Node)
- A Supabase PostgreSQL instance (local or hosted)
- A Redis instance (local or hosted, e.g. Upstash)

### Install

```bash
# 1. Clone the repository
git clone git@github.com:sconetto/kimeru-auto.git
cd kimeru-auto

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local
# Then fill in your environment variables (see .env.example)

# 4. Set up the database
npm run db:migrate
npm run db:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see
the result.

## Project Structure

```
src/
├── app/          # Next.js App Router routes (public + admin + API)
├── components/   # Reusable UI components
├── lib/          # Business logic: db, fipe, financing, fenabrave, ai, auth, i18n
└── messages/     # i18n translation dictionaries (pt-BR, en-US)
openspec/         # OpenSpec planning artifacts (proposals, specs, designs)
tests/            # Unit, integration, and E2E tests
```

## Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short description

- bullet point detail about what changed
- another bullet point with context

Signed-off-by: Your Name <you@example.com>
```

- **Type**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`
- **Scope** (optional): lowercase, matches module/area (e.g., `auth`, `ui`, `db`, `fipe`, `financing`)
- **Subject line**: imperative mood, lowercase after colon, no period, max 72 chars
- **Body**: bullet points starting with `-`, each line max 100 chars
- **One commit per logical change** — never bundle unrelated changes

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the
   layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes
   new environment variables, exposed ports, useful file locations, and
   container parameters.
3. Increase the version numbers in any examples files and the README.md to the
   new version that this Pull Request would represent.
4. You may merge the Pull Request in once you have the sign-off of the
   maintainers, or if you do not have permission to do that, you may request the
   reviewer to merge it for you.

## Reporting Bugs

Before creating bug reports, please check the existing issues to avoid
duplicates. When you are creating a bug report, please include as many details
as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce** with a stack trace if available
- **Describe the behavior you observed** and what you expected to see
- **Include screenshots** if relevant
- **Include your environment**: Node version, browser, OS

## Feature Requests

Feature suggestions are tracked as GitHub issues. When suggesting a feature:

- Explain in detail how it would work
- Keep the scope as narrow as possible to make it easier to implement
- Remember that this is a community-driven project — be open to discussion
