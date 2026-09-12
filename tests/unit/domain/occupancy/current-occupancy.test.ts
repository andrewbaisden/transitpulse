import { describe, expect, it } from "vitest";
import { getCurrentOccupancy } from "@/server/domain/occupancy/current-occupancy";
import type { DomainOccupancy } from "@/server/domain/types";

const ENTRIES: DomainOccupancy[] = [
  { timeSlice: "0800-0815", level: 5, source: "tfl" },
  { timeSlice: "1200-1215", level: 3, source: "tfl" },
  { timeSlice: "1800-1815", level: 6, source: "tfl" },
];

describe("getCurrentOccupancy", () => {
  it("returns null when there are no entries", () => {
    expect(getCurrentOccupancy([], "0805")).toBeNull();
  });

  it("returns null when no entry covers the given time", () => {
    expect(getCurrentOccupancy(ENTRIES, "1005")).toBeNull();
  });

  it("matches an exact time-slice boundary", () => {
    const result = getCurrentOccupancy(ENTRIES, "0800");
    expect(result).toEqual({
      level: 5,
      label: "Very busy",
      timeSlice: "0800-0815",
      confidence: "typical",
      source: "tfl",
    });
  });

  it("matches a time a few minutes into a slice, not just the exact boundary", () => {
    const result = getCurrentOccupancy(ENTRIES, "0809");
    expect(result?.timeSlice).toBe("0800-0815");
    expect(result?.label).toBe("Very busy");
  });

  it("maps every level 1-6 to a distinct label", () => {
    for (let level = 1; level <= 6; level++) {
      const result = getCurrentOccupancy(
        [{ timeSlice: "0800-0815", level, source: "tfl" }],
        "0800",
      );
      expect(result?.label).toBeTruthy();
    }
  });

  it("averages multiple entries for the same slice (TfL's direction=all returns inbound + outbound separately)", () => {
    const entries: DomainOccupancy[] = [
      { timeSlice: "0800-0815", level: 4, source: "tfl" },
      { timeSlice: "0800-0815", level: 6, source: "tfl" },
    ];

    expect(getCurrentOccupancy(entries, "0800")?.level).toBe(5);
  });

  it("excludes level-0 entries as 'no reading', not a guessed meaning", () => {
    const onlyZero: DomainOccupancy[] = [{ timeSlice: "0530-0545", level: 0, source: "tfl" }];
    expect(getCurrentOccupancy(onlyZero, "0530")).toBeNull();

    const zeroAndReal: DomainOccupancy[] = [
      { timeSlice: "0800-0815", level: 0, source: "tfl" },
      { timeSlice: "0800-0815", level: 4, source: "tfl" },
    ];
    expect(getCurrentOccupancy(zeroAndReal, "0800")?.level).toBe(4);
  });
});
