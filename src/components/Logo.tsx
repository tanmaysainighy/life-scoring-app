export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="display inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-base"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        aria-hidden
      >
        L
      </span>
      {!compact && <span className="display text-base">LifeScore</span>}
    </span>
  );
}
