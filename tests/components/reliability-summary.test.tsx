// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReliabilitySummary } from "@/components/network/reliability-summary";
import type { LineReliability } from "@/server/queries/reliability";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ReliabilitySummary", () => {
  it("shows an honest 'not enough data' message rather than a fabricated figure", () => {
    render(<ReliabilitySummary reliability={null} />);
    expect(screen.getByText("Not enough data yet.")).toBeInTheDocument();
  });

  it("shows 'last N days' when coverage spans the full requested window", () => {
    const coverageEnd = new Date("2026-09-18T07:15:00.000Z");
    const reliability: LineReliability = {
      goodServicePercent: 92.5,
      coverageStart: new Date(coverageEnd.getTime() - 7 * DAY_MS),
      coverageEnd,
      windowDays: 7,
      algorithmVersion: 1,
    };

    render(<ReliabilitySummary reliability={reliability} />);

    expect(screen.getByText(/92\.5%/)).toBeInTheDocument();
    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("discloses partial coverage honestly instead of claiming the full window", () => {
    const coverageEnd = new Date("2026-09-11T10:15:00.000Z");
    const reliability: LineReliability = {
      goodServicePercent: 100,
      coverageStart: new Date(coverageEnd.getTime() - 3 * 60 * 60 * 1000), // 3 hours
      coverageEnd,
      windowDays: 7,
      algorithmVersion: 1,
    };

    render(<ReliabilitySummary reliability={reliability} />);

    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByText(/Based on 3 hours of data since/)).toBeInTheDocument();
    expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
  });
});
