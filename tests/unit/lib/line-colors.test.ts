import { describe, expect, it } from "vitest";
import { getLineColor } from "@/lib/line-colors";

describe("getLineColor", () => {
  it("uses a provider colour when one is available", () => {
    expect(getLineColor("Central", "#123456")).toBe("#123456");
  });

  it("falls back to the TfL line colour when the provider omits one", () => {
    expect(getLineColor("Bakerloo", null)).toBe("#B36305");
    expect(getLineColor("Waterloo & City", null)).toBe("#6ECEB2");
    expect(getLineColor("Windrush", null)).toBe("#E32017");
  });

  it("uses a neutral colour for an unknown line", () => {
    expect(getLineColor("Future service", null)).toBe("#64748B");
  });
});
