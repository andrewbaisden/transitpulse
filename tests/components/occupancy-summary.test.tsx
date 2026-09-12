// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OccupancySummary } from "@/components/network/occupancy-summary";
import type { StationLineOccupancy } from "@/server/queries/occupancy";

describe("OccupancySummary", () => {
  it("shows an honest 'not enough data' message when no lines are given", () => {
    render(<OccupancySummary occupancies={[]} />);
    expect(screen.getByText("Not enough data yet.")).toBeInTheDocument();
  });

  it("shows a line's typical crowding, framed as historical not live", () => {
    const occupancies: StationLineOccupancy[] = [
      {
        lineId: "central-id",
        lineName: "Central",
        lineColor: "#DC241F",
        occupancy: {
          level: 5,
          label: "Very busy",
          timeSlice: "0800-0815",
          confidence: "typical",
          source: "tfl",
        },
      },
    ];

    render(<OccupancySummary occupancies={occupancies} />);

    expect(screen.getByText("Central")).toBeInTheDocument();
    expect(screen.getByText("Very busy")).toBeInTheDocument();
    expect(screen.getByText(/Typical for this time/)).toBeInTheDocument();
  });

  it("shows an honest 'not available' for a line with no occupancy data", () => {
    const occupancies: StationLineOccupancy[] = [
      { lineId: "dlr-id", lineName: "DLR", lineColor: null, occupancy: null },
    ];

    render(<OccupancySummary occupancies={occupancies} />);

    expect(screen.getByText("DLR")).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
  });
});
