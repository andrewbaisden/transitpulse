// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineCard } from "@/components/network/line-card";
import type { LineWithStatus } from "@/server/queries/network";

const baseLine: LineWithStatus = {
  id: "central-id",
  name: "Central",
  mode: "TUBE",
  color: "#DC241F",
  status: "MINOR_DELAYS",
  statusDescription: "Signal failure at Leytonstone.",
  statusRecordedAt: new Date(),
};

describe("LineCard", () => {
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
});
