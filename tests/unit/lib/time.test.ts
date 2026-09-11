import { describe, expect, it } from "vitest";
import { formatCountdown } from "@/lib/time";

describe("formatCountdown", () => {
  const now = new Date("2026-09-11T12:00:00Z");

  it('returns "Due" for a time within 30 seconds', () => {
    expect(formatCountdown(new Date("2026-09-11T12:00:20Z"), now)).toBe("Due");
  });

  it('returns "Due" for a time already in the past', () => {
    expect(formatCountdown(new Date("2026-09-11T11:59:00Z"), now)).toBe("Due");
  });

  it("returns whole minutes for a time further out", () => {
    expect(formatCountdown(new Date("2026-09-11T12:04:00Z"), now)).toBe("4 min");
  });
});
