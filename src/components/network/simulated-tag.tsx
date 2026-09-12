/**
 * AGENTS.md non-negotiable rule: "Simulation data must always be visually
 * distinguishable from live data — never silently blended." Every call
 * site that shows a line's status checks `source === "simulation"` and
 * renders this instead of staying silent. See DECISIONS.md ADR-024.
 */
export function SimulatedTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-500/50 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
      Simulated
    </span>
  );
}
