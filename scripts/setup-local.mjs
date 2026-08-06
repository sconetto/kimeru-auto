#!/usr/bin/env node
/**
 * Kimeru Auto — local environment bootstrap.
 *
 *   npm run setup:local
 *
 * Brings a fresh clone to a fully testable state:
 *   1. Verify Docker is available
 *   2. Start Postgres 17 + Redis 7 via docker compose
 *   3. Wait for services to become healthy
 *   4. Generate .env.local from .env.example (never overwrites an existing one)
 *   5. Apply database migrations
 *   6. Seed reference data
 *
 * Idempotent: safe to re-run at any time.
 *
 * Node built-ins only — no external dependencies.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const COMPOSE_URL = "postgresql://postgres:postgres@localhost:55432/kimeru-auto";
const PG_CONTAINER = "kimeru-auto-pg";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function log(msg) {
  console.log(`  ${msg}`);
}

function ok(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
}

function fail(msg) {
  console.error(`  ${RED}✗${RESET} ${msg}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: opts.silent ? "pipe" : "inherit",
    ...opts,
  });
  if (result.status !== 0 && !opts.ignoreFailure) {
    fail(`Command failed: ${cmd} ${args.join(" ")} (exit ${result.status})`);
  }
  return result;
}

function dockerAvailable() {
  const result = spawnSync("docker", ["--version"], { stdio: "pipe" });
  if (result.status !== 0) {
    fail("Docker is not available. Install Docker Desktop (or a Docker daemon) and try again.");
  }
  return true;
}

function composeUp() {
  log("Starting Postgres 17 + Redis 7...");
  run("docker", ["compose", "up", "-d"], { silent: true, ignoreFailure: true });
  // If the silent run failed, surface the real error non-silently
  run("docker", ["compose", "up", "-d"]);
  ok("Containers started");
}

function waitForHealthy(timeoutMs = 120_000) {
  log("Waiting for services to become healthy...");
  const started = Date.now();
  const containers = ["kimeru-auto-pg", "kimeru-auto-redis"];
  while (Date.now() - started < timeoutMs) {
    const result = spawnSync(
      "docker",
      ["inspect", "--format", "{{.State.Health.Status}}", ...containers],
      { stdio: "pipe" },
    );
    if (result.status === 0) {
      const statuses = result.stdout.toString().trim().split("\n");
      if (statuses.every((s) => s === "healthy")) {
        ok("All services healthy");
        return;
      }
    }
    spawnSync("sleep", ["2"]);
  }
  fail("Timed out waiting for containers to become healthy. Run `docker compose ps` to inspect.");
}

function pgReady() {
  const result = spawnSync("docker", ["exec", PG_CONTAINER, "pg_isready", "-U", "postgres"], {
    stdio: "pipe",
  });
  return result.status === 0;
}

function waitForPostgres(timeoutMs = 120_000) {
  log("Waiting for Postgres to accept connections...");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (pgReady()) {
      ok("Postgres accepting connections");
      return;
    }
    spawnSync("sleep", ["2"]);
  }
  fail("Postgres did not become ready in time.");
}

function generateEnvFile() {
  const examplePath = resolve(ROOT, ".env.example");
  const envPath = resolve(ROOT, ".env.local");
  if (existsSync(envPath)) {
    warn("Existing .env.local found — leaving it untouched");
    return;
  }
  if (!existsSync(examplePath)) {
    fail(".env.example not found — cannot generate .env.local");
  }

  const template = readFileSync(examplePath, "utf8");
  const secret = randomBytes(32).toString("base64");
  const adminPassword = randomBytes(12)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16);

  const envLocal = template
    .replace("postgresql://postgres:postgres@localhost:5432/kimeru-auto", COMPOSE_URL)
    .replace("AUTH_SECRET=replace-with-a-random-32-char-string", `AUTH_SECRET=${secret}`)
    .replace("ADMIN_PASSWORD=replace-with-a-strong-password", `ADMIN_PASSWORD=${adminPassword}`)
    .replace("AUTH_URL=http://localhost:3000", "AUTH_URL=http://localhost:3000");

  writeFileSync(envPath, envLocal);
  ok(".env.local generated from .env.example (random AUTH_SECRET + admin password)");
}

function runMigrations() {
  log("Applying database migrations...");
  run("npm", ["run", "db:migrate"]);
  ok("Migrations applied");
}

function seedDatabase() {
  log("Seeding reference data...");
  run("npm", ["run", "db:seed"]);
  ok("Reference data seeded");
}

function main() {
  console.log(`\n${BOLD}Kimeru Auto — local environment setup${RESET}\n`);

  dockerAvailable();
  composeUp();
  waitForHealthy();
  waitForPostgres();
  generateEnvFile();
  runMigrations();
  seedDatabase();

  console.log(`
  ${GREEN}${BOLD}✅ Local environment ready!${RESET}

  Next steps:
    ${BOLD}npm run dev${RESET}          → start the dev server (http://localhost:3000)
    ${BOLD}npm run test:e2e${RESET}     → run Playwright E2E tests
    ${BOLD}npm run test${RESET}         → run unit/integration tests
    ${BOLD}npm run db:studio${RESET}    → open Drizzle Studio (DB GUI)

  Services:
    Postgres  ${GREEN}localhost:55432${RESET}  (kimeru-auto / postgres / postgres)
    Redis     ${GREEN}localhost:56379${RESET}
`);
}

main();
