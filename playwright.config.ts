import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Load the same .env.local the app uses so E2E tests exercise the real
// seeded admin credentials (ADMIN_EMAIL / ADMIN_PASSWORD) instead of a
// hardcoded copy that can drift from what `npm run setup:local` seeded.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const PORT = 3000;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Local runs cap workers + allow retries so Next.js dev-mode on-demand
  // compilation doesn't cause flaky timeouts; CI uses 1 worker + 2 retries.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Cold Turbopack compile after a .next cache clear can exceed 2 minutes
    // (especially with many admin routes), so allow up to 5 minutes to boot.
    timeout: 300_000,
  },
});
