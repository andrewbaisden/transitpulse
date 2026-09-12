/**
 * TfL mode and line colours used when a provider does not supply one.
 * Provider colours still win so non-TfL and future lines retain their own
 * branding. Keeping the fallback in the presentation layer avoids leaking a
 * UI concern into provider or domain types.
 */
const TFL_LINE_COLORS: Record<string, string> = {
  bakerloo: "#B36305",
  central: "#E32017",
  circle: "#FFD300",
  district: "#00782A",
  dlr: "#00A4A7",
  elizabeth: "#6950A1",
  "elizabeth line": "#6950A1",
  "hammersmith & city": "#F3A9BB",
  jubilee: "#7B868C",
  liberty: "#5F6369",
  lioness: "#F3A000",
  metropolitan: "#9B0056",
  mildmay: "#0077B5",
  northern: "#111111",
  piccadilly: "#003688",
  suffragette: "#5AB54A",
  tram: "#84B817",
  victoria: "#0098D4",
  "waterloo & city": "#6ECEB2",
  weaver: "#9B0058",
  windrush: "#E32017",
};

export function getLineColor(name: string, providerColor: string | null): string {
  return providerColor ?? TFL_LINE_COLORS[name.trim().toLowerCase()] ?? "#64748B";
}
