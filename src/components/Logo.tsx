export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ background: "linear-gradient(140deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #22d3ee))" }}
        aria-hidden
      >
        L
      </span>
      {!compact && <span className="text-[0.9375rem] font-semibold tracking-tight">LifeScore</span>}
    </span>
  );
}
