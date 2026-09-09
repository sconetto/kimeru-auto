import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/**", "src/components/**"],
      exclude: ["src/components/ui/**"],
      // Floor slightly below current measured coverage (~22% stmts / ~21%
      // lines) so accidental test deletion is caught without blocking new
      // code that lacks coverage yet.
      thresholds: {
        statements: 20,
        branches: 17,
        functions: 19,
        lines: 18,
      },
    },
    css: true,
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
});
