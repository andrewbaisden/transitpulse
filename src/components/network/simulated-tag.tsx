/**
 * AGENTS.md non-negotiable rule: "Simulation data must always be visually
 * distinguishable from live data — never silently blended." Every call
 * site that shows a line's status checks `source === "simulation"` and
 * renders this instead of staying silent. See DECISIONS.md ADR-024.
 */
export function SimulatedTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-300 bg-[repeating-linear-gradient(135deg,#f5f3ff,#f5f3ff_4px,#ede9fe_4px,#ede9fe_8px)] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-violet-700 uppercase shadow-sm">
      Simulated
    </span>
  );
}
