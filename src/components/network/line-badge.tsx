import { getLineColor } from "@/lib/line-colors";

export function LineBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string | null;
  className?: string;
}) {
  const lineColor = getLineColor(name, color);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-white ${className ?? ""}`}
      style={{ backgroundColor: lineColor, borderColor: lineColor }}
    >
      {name}
    </span>
  );
}
