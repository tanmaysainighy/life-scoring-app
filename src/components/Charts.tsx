/**
 * Charts as plain SVG, rendered on the server. No charting library, no client
 * JavaScript, no layout shift — the markup arrives already drawn.
 */

export function XpBars({ series }: { series: { day: string; xp: number }[] }) {
  const max = Math.max(10, ...series.map((point) => point.xp));

  return (
    <div>
      <div className="flex h-28 items-end gap-1.5" role="img" aria-label="Daily XP for the last two weeks">
        {series.map((point) => (
          <div key={point.day} className="group relative flex flex-1 flex-col justify-end">
            <div
              className="bar-fill w-full rounded-t-[3px]"
              style={{
                height: `${Math.max(point.xp === 0 ? 2 : 8, (point.xp / max) * 100)}%`,
                background: point.xp === 0 ? "var(--line)" : "var(--accent)",
                opacity: point.xp === 0 ? 1 : 0.35 + 0.65 * (point.xp / max),
              }}
            />
            <span className="tabular pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[0.625rem] font-medium text-bg opacity-0 transition-opacity group-hover:opacity-100">
              {point.xp}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.6875rem] text-faint">
        <span>{shortDay(series[0]?.day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function CategoryBars({
  categories,
}: { categories: { category: string; xp: number; minutes: number }[] }) {
  if (categories.length === 0) {
    return <p className="py-4 text-sm text-muted">No activity yet.</p>;
  }
  const total = categories.reduce((sum, row) => sum + row.xp, 0) || 1;

  return (
    <ul className="space-y-2.5">
      {categories.map((row) => {
        const percent = Math.round((row.xp / total) * 100);
        return (
          <li key={row.category}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate capitalize">{row.category.replace(/_/g, " ")}</span>
              <span className="tabular shrink-0 text-xs text-faint">
                {Math.round(row.minutes / 60)}h · {row.xp.toLocaleString()} XP
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="bar-fill h-full rounded-full" style={{ width: `${percent}%`, background: "var(--accent)" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function shortDay(day?: string): string {
  if (!day) return "";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}
