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
    const { slugify } = await import("@/lib/catalog/slug");
    expect(slugify("Honda Civic")).toBe("honda-civic");
  });
});
