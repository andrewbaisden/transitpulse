export function LineBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string | null;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-white ${className ?? ""}`}
      style={{ backgroundColor: color ?? "#52525b", borderColor: color ?? "#52525b" }}
    >
      {name}
    </span>
  );
}
