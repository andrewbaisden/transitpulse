import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Map as MapIcon,
  Radio,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { LineCard } from "@/components/network/line-card";
import { getNetworkOverview } from "@/server/queries/network";

// Renders "Updated X ago" from live data — must not be frozen into a
// build-time static page.
export const dynamic = "force-dynamic";

export default async function NetworkOverviewPage() {
  const overview = await getNetworkOverview();

  if (!overview) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-12 text-center shadow-soft">
        <p className="text-lg font-semibold text-[#0a2540]">No network data yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">pnpm db:seed</code> to
          load demo data.
        </p>
      </div>
    );
  }

  const goodService = overview.lines.filter((line) => line.status === "GOOD_SERVICE").length;
  const minorDelays = overview.lines.filter((line) => line.status === "MINOR_DELAYS").length;
  const severeIssues = overview.lines.filter((line) =>
    ["SEVERE_DELAYS", "PART_CLOSURE", "SUSPENDED"].includes(line.status),
  ).length;

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <section className="network-grid relative isolate overflow-hidden rounded-[2rem] border border-white/70 bg-white px-6 py-14 shadow-soft sm:px-10 sm:py-18 lg:min-h-[500px] lg:px-14 lg:py-20">
        <div
          className="aurora-sweep pointer-events-none absolute inset-0 -z-10 opacity-90"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(255,255,255,.98)_0%,rgba(255,255,255,.94)_42%,rgba(255,255,255,.28)_72%,rgba(255,255,255,.08)_100%)]"
          aria-hidden
        />

        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {overview.networkName} network intelligence
          </div>

          <h1 className="text-balance text-[clamp(3.25rem,8vw,6.8rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-[#0a2540]">
            Know your network
            <span className="mt-2 block bg-[linear-gradient(100deg,#635bff_5%,#9c4dff_35%,#e548a9_65%,#f47820_95%)] bg-clip-text text-transparent">
              before you travel.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Live service status, arrivals and reliability across London transport—clear enough to
            understand at a glance.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/lines"
              className="group inline-flex items-center gap-2 rounded-full bg-[#0a2540] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-[#163f63]"
            >
              View all lines
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-[#0a2540] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
            >
              <MapIcon className="size-4 text-[#635bff]" />
              Open network map
            </Link>
          </div>
        </div>

        <div className="absolute right-8 bottom-8 hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 shadow-xl backdrop-blur lg:flex">
          <Radio className="size-4 text-[#635bff]" />
          {overview.lines.length} lines monitored
        </div>
      </section>

      <section aria-labelledby="network-pulse-heading">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">
              At a glance
            </p>
            <h2
              id="network-pulse-heading"
              className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0a2540] sm:text-4xl"
            >
              Network pulse
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            The latest recorded status for every monitored service in the network.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryStat
            label="Good service"
            value={goodService}
            description="Running without reported disruption"
            icon={<CheckCircle2 className="size-5" />}
            tone="good"
          />
          <SummaryStat
            label="Minor delays"
            value={minorDelays}
            description="Services with lower-level disruption"
            icon={<CircleAlert className="size-5" />}
            tone="minor"
          />
          <SummaryStat
            label="Severe issues"
            value={severeIssues}
            description="Severe delays, closures or suspensions"
            icon={<TriangleAlert className="size-5" />}
            tone="severe"
          />
        </dl>
      </section>

      <section aria-labelledby="lines-heading">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#635bff] uppercase">
              Live status
            </p>
            <h2
              id="lines-heading"
              className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#0a2540] sm:text-4xl"
            >
              Every line, one view
            </h2>
          </div>
          <Link
            href="/lines"
            className="hidden items-center gap-1 text-sm font-semibold text-[#635bff] hover:text-[#3f35c8] sm:flex"
          >
            Filter lines <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {overview.lines.map((line) => (
            <LineCard key={line.id} line={line} />
          ))}
        </div>
      </section>
    </div>
  );
}

const TONE_STYLES = {
  good: {
    card: "border-emerald-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#edfff8_100%)]",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
  minor: {
    card: "border-amber-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff9e8_100%)]",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  severe: {
    card: "border-rose-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff1f4_100%)]",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-700",
  },
} as const;

function SummaryStat({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: keyof typeof TONE_STYLES;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles.card}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <dt className="text-sm font-semibold text-slate-600">{label}</dt>
          <dd className={`mt-2 text-5xl font-semibold tracking-[-0.06em] ${styles.value}`}>
            {value}
          </dd>
        </div>
        <span className={`flex size-10 items-center justify-center rounded-xl ${styles.icon}`}>
          {icon}
        </span>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
