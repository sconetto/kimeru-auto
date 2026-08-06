import { describe, expect, it } from "vitest";

/**
 * Smoke test — verifies the test pipeline is wired correctly.
 * Real unit tests for business logic land in this directory.
 */
describe("test pipeline", () => {
  it("runs vitest with jsdom environment", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });

  it("resolves the @ alias", async () => {
    const { sum } = await import("@/lib/math");
    expect(sum(1, 2)).toBe(3);
  });
});
