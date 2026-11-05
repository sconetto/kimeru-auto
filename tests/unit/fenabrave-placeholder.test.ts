import { describe, expect, it } from "vitest";
import { splitReportName, toDisplayName } from "@/lib/fenabrave/report-name";

describe("splitReportName", () => {
  it("splits the BRAND/MODEL report format", () => {
    expect(splitReportName("BYD/SONG PRO")).toEqual({
      brandToken: "BYD",
      modelName: "SONG PRO",
    });
    expect(splitReportName("VW/TAOS")).toEqual({ brandToken: "VW", modelName: "TAOS" });
  });

  it("splits the 'BRAND - MODEL' format used by the XLSX upload", () => {
    expect(splitReportName("VW - T-CROSS 1.0 TSI")).toEqual({
      brandToken: "VW",
      modelName: "T-CROSS 1.0 TSI",
    });
  });

  it("is deterministic so the same name resolves to one placeholder", () => {
    const first = splitReportName("GM/ONIX 1.0");
    const second = splitReportName("GM/ONIX 1.0");
    expect(first).toEqual(second);
  });
});

describe("toDisplayName", () => {
  it("title-cases shouted names", () => {
    expect(toDisplayName("SONG PRO")).toBe("Song Pro");
    expect(toDisplayName("AION UT")).toBe("Aion Ut");
  });

  it("keeps alphanumeric model codes intact", () => {
    expect(toDisplayName("HB20S")).toBe("HB20S");
    expect(toDisplayName("SW4")).toBe("SW4");
  });
});
