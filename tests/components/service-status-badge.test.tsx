// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServiceStatusBadge } from "@/components/network/service-status-badge";

describe("ServiceStatusBadge", () => {
  it("renders a text label for each status (never colour alone)", () => {
    render(<ServiceStatusBadge status="MINOR_DELAYS" />);
    expect(screen.getByText("Minor Delays")).toBeInTheDocument();
  });

  it("renders a fallback label for an unknown status", () => {
    render(<ServiceStatusBadge status="UNKNOWN" />);
    expect(screen.getByText("Status Unknown")).toBeInTheDocument();
  });
});
