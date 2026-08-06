import { z } from "zod";

/**
 * Startup environment validation.
 *
 * Imported (for its side effect) by the Node-side auth entrypoint so a
 * missing or placeholder AUTH_SECRET fails fast at boot instead of shipping a
 * weak signing key to production.
 */
const envSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .refine(
      (v) => !/placeholder|change-me|your-secret/i.test(v),
      "AUTH_SECRET looks like a placeholder value — set a real secret",
    ),
});

const parsed = envSchema.safeParse(process.env);

// Fatal in production (including during `next build`, where NODE_ENV is set to
// "production") so a missing or placeholder signing key never ships. Dev and
// test stay permissive so tooling like vitest doesn't break on unrelated runs
// (NextAuth itself errors at runtime if AUTH_SECRET is absent).
if (!parsed.success && process.env.NODE_ENV === "production") {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment:\n${details}`);
}

export const env = parsed.success ? parsed.data : { AUTH_SECRET: process.env.AUTH_SECRET ?? "" };
