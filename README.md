# 🚗 Kimeru Auto

> Decida melhor. Dirija melhor.
> *Decide better. Drive better.*

**Kimeru Auto** (決める — *kimeru*, "to decide" in Japanese) is a free, open-source web platform that helps Brazilian car buyers compare vehicles, understand financing costs, and make confident purchase decisions.

**Kimeru Auto** é uma plataforma web gratuita e open-source que ajuda compradores de carros no Brasil a comparar veículos, entender os custos de financiamento e tomar decisões de compra com confiança.

---

## ✨ Features

### Core Tools

| Feature | Description |
|---------|-------------|
| 🆚 **Car Comparison** | Compare up to 3 cars side-by-side with 14 spec categories (engine, transmission, dimensions, consumption, safety, comfort/technology, warranty, accessories, and more). Competitive radar chart with per-category scoring, best-in-category highlighting, tie detection, and shareable URLs. |
| 💰 **Financing Calculator** | Brazilian financing simulation with **CET** (Custo Efetivo Total) per Banco Central Resolução 3.517 — includes IOF, TAC, insurance, and registration fees. PRICE table amortization schedule, cost breakdown charts, term comparison, and both slider and exact-value inputs. |
| 📊 **FIPE Table** | Real FIPE prices for both **0km** and used vehicles, with per-year depreciation bars and monthly price history. |
| 📈 **Sales Rankings** | FENABRAVE monthly sales data — see what Brazilians are actually buying, with trends and market context. |
| 📖 **About Page** | Project back story, the open-source mission, creator bio, and Ko-fi support link. |

### Platform

- 🌐 **Multi-language**: PT-BR (default) and EN-US, English canonical routes (`/compare`, `/financing`) with full UI translation via next-intl
- 🛠️ **Admin Panel**: Manage brands, models, specs, editorial content, FIPE/FENABRAVE imports, and sales analytics — no developer needed
- 🤖 **AI-Assisted Editorial**: Generate structured pros/cons/ratings from YouTube car reviews, with mandatory human review before publishing
- 📱 **Responsive**: Mobile → desktop, no native apps required
- 🔍 **SEO-First**: Structured data, sitemaps, per-locale metadata, ISR for fast pages

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19 |
| **Language** | TypeScript (strict) |
| **Database** | PostgreSQL ([Supabase](https://supabase.com/)) via [Drizzle ORM](https://orm.drizzle.team/) |
| **Cache** | Redis ([Upstash](https://upstash.com/)) |
| **Auth** | [NextAuth.js v5](https://next-auth.js.org/) (admin-only) |
| **i18n** | [next-intl](https://next-intl.dev/) |
| **UI** | [Tailwind CSS](https://tailwindcss.com/) + [lucide-react](https://lucide.dev/) icons |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| **Hosting** | [Vercel](https://vercel.com/) |
| **Monitoring** | Sentry + Vercel Analytics |

---

## 🗂 Data Sources

| Source | Purpose | Access |
|--------|---------|--------|
| [FIPE API](https://fipe.parallelum.com.br/) | Current prices, price history, reference data for cars, motorcycles, and trucks (0km via year code `32000`) | Free REST API (500 req/day, 1000 with token) |
| [FENABRAVE](https://www.fenabrave.org.br/portalv2/) | Monthly vehicle registration/sales statistics by model | Public XLSX/PDF reports (imported monthly) |
| [YouTube Data API](https://developers.google.com/youtube/v3) | Video transcripts for AI-assisted editorial content | Free tier (10k units/day) |
| Wikimedia Commons / manufacturer press kits | Car images | Public domain / licensed media |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js >= 22** (see `.nvmrc` — `nvm use`)
- **Docker** (Docker Desktop or compatible daemon) — runs the local Postgres 17 + Redis

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres 17 + Redis, generate .env.local, migrate + seed (one command)
npm run setup:local

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> ⚠️ **Note**: The app requires a working database connection. The public catalog,
> comparison, and FIPE tools will show empty states until data is seeded.
> `npm run setup:local` is idempotent — safe to re-run anytime.

> 💡 **Advanced / manual setup** (no Docker): copy `.env.example` to `.env.local`,
> point `DATABASE_URL`/`DIRECT_URL` at a Postgres 17 instance (e.g. a Supabase
> project), then run `npm run db:migrate` and `npm run db:seed` manually.

### Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run setup:local` | One-command local env: compose up → env → migrate → seed |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint code (Biome) |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run unit/integration tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed reference data |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run fipe:sync` | Sync FIPE reference data + prices |

---

## 🗺 Project Structure

```
kimeru-auto/
├── .github/            # Issue/PR templates, CI workflows
├── src/
│   ├── app/            # Next.js routes
│   │   ├── [locale]/   # Public routes (PT-BR, EN-US) — English canonical paths
│   │   │   ├── compare/      # /compare — car comparison + radar
│   │   │   ├── financing/    # /financing — financing simulator
│   │   │   ├── fipe/         # /fipe — FIPE price lookup
│   │   │   ├── brands/       # /brands — brand catalog
│   │   │   ├── car/          # /car/[slug] — car detail
│   │   │   ├── category/     # /category/[category]
│   │   │   ├── best-sellers/ # /best-sellers — FENABRAVE rankings
│   │   │   └── about/        # /about — project story + creator
│   │   ├── admin/      # Admin panel (auth-protected, PT-BR)
│   │   └── api/        # API routes (FIPE, catalog, admin)
│   ├── components/     # UI + feature components
│   ├── lib/            # Business logic (db, fipe, financing, compare, ai)
│   └── messages/       # i18n dictionaries (pt-BR.json, en-US.json)
├── ops/               # Operational runbooks (import, rollback, incidents)
└── tests/              # Unit, integration, E2E tests
```

---

## 🧭 Planning-First Development

Kimeru Auto is built with **OpenSpec** — every feature starts as a change
proposal (proposal → design → specs → tasks) before any code is written.

> ℹ️ OpenSpec planning artifacts (`openspec/`) and agent tooling (`.opencode/`)
> are **local-only** and intentionally excluded from version control.

```bash
openspec list                      # View active changes
openspec show kimeru-auto-mvp      # View current change details
openspec validate kimeru-auto-mvp  # Validate artifacts
```

---

## 🤝 Contributing

We welcome contributions! Please read our
**[Contributing Guidelines](CONTRIBUTING.md)** first.

- Report bugs and request features via [GitHub Issues](https://github.com/sconetto/kimeru-auto/issues)
- Follow the **[Code of Conduct](CODE_OF_CONDUCT.md)**
- Found a security issue? See our **[Security Policy](SECURITY.md)**
- Like the project? Consider [supporting it on Ko-fi](https://ko-fi.com/sconetto) ☕

---

## 📄 License

This project is licensed under the **GNU GPL v3** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **FIPE** (Fundação Instituto de Pesquisas Econômicas) — official vehicle price data
- **FENABRAVE** — official vehicle registration statistics
- **Parallelum** — maintainers of the free community FIPE API
- The Brazilian automotive community whose YouTube reviews power our AI editorial pipeline
