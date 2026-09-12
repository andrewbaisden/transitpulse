// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LineStatusCard } from "@/components/network/line-status-card";
import { useLiveStatusStore } from "@/lib/live-status-store";

describe("LineStatusCard", () => {
  beforeEach(() => {
    useLiveStatusStore.setState({ overrides: {} });
  });

  it("renders the initial server-rendered status and description", () => {
    render(
      <LineStatusCard
        lineId="central-id"
        status="MINOR_DELAYS"
        description="Signal failure at Leytonstone."
        recordedAt={new Date("2026-09-11T08:00:00Z")}
      />,
    );

    expect(screen.getByText("Minor Delays")).toBeInTheDocument();
    expect(screen.getByText("Signal failure at Leytonstone.")).toBeInTheDocument();
  });

  it("live-patches the status, description, and timestamp when an update arrives", () => {
    render(
      <LineStatusCard
        lineId="central-id"
        status="MINOR_DELAYS"
        description="Signal failure at Leytonstone."
        recordedAt={new Date("2026-09-11T08:00:00Z")}
      />,
    );

    act(() => {
      useLiveStatusStore.getState().setOverride("central-id", {
        status: "GOOD_SERVICE",
        description: null,
        recordedAt: new Date("2026-09-11T09:00:00Z"),
      });
    });

    expect(screen.getByText("Good Service")).toBeInTheDocument();
    expect(screen.queryByText("Signal failure at Leytonstone.")).not.toBeInTheDocument();
  });

  it("ignores updates for a different lineId", () => {
    render(
      <LineStatusCard
        lineId="central-id"
        status="MINOR_DELAYS"
        description="Signal failure at Leytonstone."
        recordedAt={new Date("2026-09-11T08:00:00Z")}
      />,
    );

    act(() => {
      useLiveStatusStore.getState().setOverride("jubilee-id", {
        status: "SUSPENDED",
        description: "Track fire",
        recordedAt: new Date(),
      });
    });

    expect(screen.getByText("Minor Delays")).toBeInTheDocument();
  });
});
