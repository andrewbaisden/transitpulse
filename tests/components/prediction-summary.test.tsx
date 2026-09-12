// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PredictionSummary } from "@/components/network/prediction-summary";
import type { LinePredictionSummary } from "@/server/queries/prediction";

describe("PredictionSummary", () => {
  it("renders nothing when there is no unevaluated prediction", () => {
    const { container } = render(
      <PredictionSummary prediction={{ latest: null, accuracy: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the forecast, labelled as baseline-based not a trained model", () => {
    const prediction: LinePredictionSummary = {
      latest: {
        predictedGoodServicePercent: 92,
        targetWindowStart: new Date("2026-09-12T00:00:00Z"),
        targetWindowEnd: new Date("2026-09-13T00:00:00Z"),
        algorithmVersion: 1,
      },
      accuracy: null,
    };

    render(<PredictionSummary prediction={prediction} />);

    expect(screen.getByText(/92%/)).toBeInTheDocument();
    expect(screen.getByText(/not a trained model/)).toBeInTheDocument();
  });

  it("shows recent accuracy when evaluated predictions exist", () => {
    const prediction: LinePredictionSummary = {
      latest: {
        predictedGoodServicePercent: 92,
        targetWindowStart: new Date("2026-09-12T00:00:00Z"),
        targetWindowEnd: new Date("2026-09-13T00:00:00Z"),
        algorithmVersion: 1,
      },
      accuracy: { averageErrorPoints: 4.5, evaluatedCount: 3 },
    };

    render(<PredictionSummary prediction={prediction} />);

    expect(screen.getByText(/within 4\.5 points on average/)).toBeInTheDocument();
    expect(screen.getByText(/last 3 evaluated days/)).toBeInTheDocument();
  });
});
