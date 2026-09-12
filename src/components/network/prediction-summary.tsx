import { formatLondonDateTime } from "@/lib/time";
import type { LinePredictionSummary } from "@/server/queries/prediction";

/**
 * A baseline-persistence forecast, not a trained model — labelled as such
 * so it's never mistaken for something more sophisticated than it is. See
 * DECISIONS.md ADR-023.
 */
export function PredictionSummary({ prediction }: { prediction: LinePredictionSummary }) {
  if (!prediction.latest) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Forecast</h2>
      <p className="mt-1 text-2xl font-bold tracking-tight">
        {prediction.latest.predictedGoodServicePercent}%{" "}
        <span className="text-base font-normal">good service</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Predicted for {formatLondonDateTime(prediction.latest.targetWindowStart)} –{" "}
        {formatLondonDateTime(prediction.latest.targetWindowEnd)}, based on the trailing 7-day
        baseline — not a trained model.
      </p>
      {prediction.accuracy && (
        <p className="mt-2 text-xs text-muted-foreground">
          Recent forecasts have been within {prediction.accuracy.averageErrorPoints} points on
          average, over the last {prediction.accuracy.evaluatedCount} evaluated day
          {prediction.accuracy.evaluatedCount === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
