// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LineCard } from "@/components/network/line-card";
import { useLiveStatusStore } from "@/lib/live-status-store";
import type { LineWithStatus } from "@/server/queries/network";

const baseLine: LineWithStatus = {
  id: "central-id",
  name: "Central",
  mode: "TUBE",
  color: "#DC241F",
  source: "demo",
  status: "MINOR_DELAYS",
  statusDescription: "Signal failure at Leytonstone.",
  statusRecordedAt: new Date(),
};

describe("LineCard", () => {
  beforeEach(() => {
    useLiveStatusStore.setState({ overrides: {} });
  });

  it("renders the line name, mode, and status label", () => {
    render(<LineCard line={baseLine} />);

    expect(screen.getByText("Central")).toBeInTheDocument();
    expect(screen.getByText("Underground")).toBeInTheDocument();
    expect(screen.getByText("Minor Delays")).toBeInTheDocument();
  });

  it("links to the line detail page", () => {
    render(<LineCard line={baseLine} />);
    expect(screen.getByTestId("line-card")).toHaveAttribute("href", "/lines/central-id");
  });

  it("live-patches the badge when a status update arrives for this line", () => {
    render(<LineCard line={baseLine} />);
    expect(screen.getByText("Minor Delays")).toBeInTheDocument();

    act(() => {
      useLiveStatusStore.getState().setOverride("central-id", {
        status: "SEVERE_DELAYS",
        description: "Track fire at Bank.",
        recordedAt: new Date(),
      });
    });

    expect(screen.getByText("Severe Delays")).toBeInTheDocument();
    expect(screen.queryByText("Minor Delays")).not.toBeInTheDocument();
  });

  it("shows a Simulated tag only when the line's source is simulation", () => {
    render(<LineCard line={{ ...baseLine, source: "simulation" }} />);
    expect(screen.getByText("Simulated")).toBeInTheDocument();
  });

  it("does not show a Simulated tag for a real source", () => {
    render(<LineCard line={baseLine} />);
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
  });
});
