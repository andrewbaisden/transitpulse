// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArrivalBoard } from "@/components/network/arrival-board";
import type { ArrivalBoard as ArrivalBoardData } from "@/server/queries/arrivals";

describe("ArrivalBoard", () => {
  it("renders each row with line, destination, and countdown", () => {
    const board: ArrivalBoardData = {
      source: "demo",
      fetchedAt: new Date(),
      unavailable: false,
      rows: [
        {
          lineId: "line-1",
          lineName: "Central",
          lineColor: "#DC241F",
          destinationName: "Ealing Broadway",
          // formatCountdown compares against the real clock (no injectable
          // "now" — this is a one-shot server render, not a ticking timer),
          // so the fixture has to be relative to it too, not a fixed date.
          expectedArrival: new Date(Date.now() + 4 * 60_000),
        },
      ],
    };

    render(<ArrivalBoard board={board} />);

    expect(screen.getByText("Central")).toBeInTheDocument();
    expect(screen.getByText("Ealing Broadway")).toBeInTheDocument();
    expect(screen.getByText("4 min")).toBeInTheDocument();
    expect(screen.getByText(/Source: demo/)).toBeInTheDocument();
  });

  it("shows an unavailable message rather than an empty-looking board when the live fetch failed", () => {
    const board: ArrivalBoardData = {
      source: "tfl",
      fetchedAt: new Date(),
      unavailable: true,
      rows: [],
    };

    render(<ArrivalBoard board={board} />);

    expect(screen.getByText(/aren't available/i)).toBeInTheDocument();
  });

  it("shows a no-arrivals message when the fetch succeeded but returned nothing", () => {
    const board: ArrivalBoardData = {
      source: "tfl",
      fetchedAt: new Date(),
      unavailable: false,
      rows: [],
    };

    render(<ArrivalBoard board={board} />);

    expect(screen.getByText(/no upcoming arrivals/i)).toBeInTheDocument();
  });
});
