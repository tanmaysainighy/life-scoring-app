import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Centred card used by sign-in and sign-up, with a short explainer beside it. */
export function AuthShell({
  title, subtitle, children,
}: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-5 py-10 lg:flex-row lg:gap-20">
      <div className="w-full max-w-sm lg:max-w-md">
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Say what you did.<br />Get a fair score.
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Write it in plain language — <em>“worked on my AI agent for 4 hours”</em> — and LifeScore turns
          it into XP using the same rules for everyone. Build a streak, level up, and see where you land
          against your friends.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted">
          <li className="flex gap-2"><span aria-hidden>⚖️</span> Same activity, same score — for every user</li>
          <li className="flex gap-2"><span aria-hidden>🔥</span> Daily streaks that reset honestly</li>
          <li className="flex gap-2"><span aria-hidden>🏆</span> Group leaderboards, calculated server-side</li>
        </ul>
      </div>

      <div className="card w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mb-5 mt-0.5 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
