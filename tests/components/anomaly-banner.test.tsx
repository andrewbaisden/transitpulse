// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnomalyBanner } from "@/components/network/anomaly-banner";
import type { LineAnomaly } from "@/server/queries/anomaly";

describe("AnomalyBanner", () => {
  it("renders nothing when there is no anomaly", () => {
    const { container } = render(<AnomalyBanner anomaly={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the explanation when an anomaly is detected", () => {
    const anomaly: LineAnomaly = {
      recentGoodServicePercent: 60,
      baselineGoodServicePercent: 95,
      deviationPoints: 35,
      explanation:
        "Reliability in the last day (60% good service) is 35 points below its typical baseline (95% over the past week).",
      algorithmVersion: 1,
    };

    render(<AnomalyBanner anomaly={anomaly} />);

    expect(screen.getByText("Unusual reliability")).toBeInTheDocument();
    expect(screen.getByText(anomaly.explanation)).toBeInTheDocument();
  });
});
