import type { ReactNode } from "react";

/** Presentational primitives. Server components — no client JS shipped. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
      <h2 className="label">{children}</h2>
      {/* Negative margin keeps the link visually aligned while its tap area
          extends to a comfortable size. */}
      {action && <div className="-my-2 -mr-2 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:px-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: {
  label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "accent";
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`figure mt-2 text-[1.75rem] ${tone === "accent" ? "text-accent-text" : ""}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(145deg, hsl(${hue} 62% 55%), hsl(${(hue + 45) % 360} 64% 42%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

/**
 * Level progress as an arc rather than a bar — it reads as a dial, gives the
 * level number a home, and animates by drawing itself in.
 */
export function LevelArc({
  level, percent, size = 132,
}: { level: number; percent: number; size?: number }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Three-quarter dial: a 270° sweep starting bottom-left.
  const sweep = 0.75;
  const filled = Math.min(100, Math.max(0, percent)) / 100;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[225deg]" aria-hidden>
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--line)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circumference * sweep} ${circumference}`}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circumference * sweep} ${circumference}`}
          strokeDashoffset={circumference * sweep * (1 - filled)}
          className="draw"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="label text-[0.625rem]">Level</span>
        <span className="figure text-[2.5rem]">{level}</span>
      </div>
    </div>
  );
}

export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className="grow h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: "var(--accent)" }}
      />
    </div>
  );
}

/** Frames an activity's emoji so it reads as a mark rather than loose text. */
export function Glyph({ icon, size = 38 }: { icon: string; size?: number }) {
  return (
    <span className="glyph" style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden>
      {icon}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }: {
  icon: string; title: string; body: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Glyph icon={icon} size={44} />
      <p className="mt-1 font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export const MEDALS = ["🥇", "🥈", "🥉"];
