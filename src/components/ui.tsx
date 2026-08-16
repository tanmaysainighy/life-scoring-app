import type { ReactNode } from "react";

/** Small presentational primitives. Server components — no client JS shipped. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-faint">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className="tabular mt-1 text-2xl font-semibold leading-none">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(140deg, hsl(${hue} 68% 58%), hsl(${(hue + 40) % 360} 70% 46%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className="bar-fill h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: "var(--accent)" }}
      />
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <div className="text-2xl" aria-hidden>{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "warn" }) {
  const tones = {
    default: "bg-raised text-muted",
    accent: "bg-accent-soft text-accent",
    warn: "text-warn",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const MEDALS = ["🥇", "🥈", "🥉"];
