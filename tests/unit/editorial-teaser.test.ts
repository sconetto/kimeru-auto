import { describe, expect, it } from "vitest";
import { editorialTeaser, youtubeId } from "@/lib/editorial/teaser";

describe("editorialTeaser", () => {
  it("returns null for missing summary", () => {
    expect(editorialTeaser(null)).toBeNull();
    expect(editorialTeaser("")).toBeNull();
    expect(editorialTeaser("   ")).toBeNull();
  });

  it("strips markdown headings and emphasis", () => {
    const md = "## Desempenho\nO motor **1.0 Turbo** entrega performance.";
    expect(editorialTeaser(md)).toBe("Desempenho O motor 1.0 Turbo entrega performance.");
  });

  it("resolves markdown links to their text", () => {
    const md = "Veja o [review completo](https://youtube.com/watch?v=abc) aqui.";
    expect(editorialTeaser(md)).toBe("Veja o review completo aqui.");
  });

  it("collapses whitespace and trims", () => {
    expect(editorialTeaser("  Linha um\n\n  Linha dois  ")).toBe("Linha um Linha dois");
  });

  it("truncates long summaries with an ellipsis at maxLength", () => {
    const long = "a".repeat(200);
    const out = editorialTeaser(long);
    expect(out).toHaveLength(161); // 160 chars + …
    expect(out?.endsWith("…")).toBe(true);
  });

  it("keeps short summaries intact", () => {
    expect(editorialTeaser("Curto resumo.")).toBe("Curto resumo.");
  });

  it("respects a custom maxLength", () => {
    const out = editorialTeaser("abcdefghij", 5);
    expect(out).toBe("abcde…");
  });
});

describe("youtubeId", () => {
  it("extracts IDs from all common YouTube URL formats", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid or non-YouTube URLs", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=abc")).toBeNull();
    expect(youtubeId("https://example.com/video")).toBeNull();
    expect(youtubeId("")).toBeNull();
  });
});
