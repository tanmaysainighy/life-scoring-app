"use client";

import { useState } from "react";
import { Avatar, MEDALS } from "./ui";
import type { LeaderboardPeriod, LeaderboardRow } from "@/lib/queries";

/**
 * Ranks come from the server. Switching period fetches a fresh aggregate rather
 * than re-sorting anything locally — the client never holds the authority.
 */

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "today", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "all", label: "All-time" },
];

export function Leaderboard({
  endpoint, initial, initialPeriod = "week", currentUserId,
}: {
  endpoint: string;
  initial: LeaderboardRow[];
  initialPeriod?: LeaderboardPeriod;
  currentUserId: string;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const cache = useState(() => new Map<string, LeaderboardRow[]>([[initialPeriod, initial]]))[0];

  async function select(next: LeaderboardPeriod) {
    setPeriod(next);
    const hit = cache.get(next);
    if (hit) { setRows(hit); return; }

    setLoading(true);
    const response = await fetch(`${endpoint}?period=${next}`).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setLoading(false);
    if (payload?.data?.leaderboard) {
      cache.set(next, payload.data.leaderboard);
      setRows(payload.data.leaderboard);
    }
  }

  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg border p-0.5">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => select(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === value ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ol className={`divide-y transition-opacity ${loading ? "opacity-50" : ""}`}>
        {rows.map((row, index) => (
          <li
            key={row.user_id}
            className={`flex items-center gap-3 py-2.5 ${row.user_id === currentUserId ? "font-medium" : ""}`}
          >
            <span className="tabular w-7 shrink-0 text-center text-sm text-faint">
              {index < 3 ? <span aria-hidden>{MEDALS[index]}</span> : index + 1}
            </span>
            <Avatar name={row.name} hue={row.avatar_hue} size={30} />
            <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
              {row.name}
              {row.user_id === currentUserId && <span className="ml-1.5 text-xs text-accent">you</span>}
            </span>
            <span className="tabular shrink-0 text-sm font-semibold">{row.xp.toLocaleString()}</span>
            <span className="text-xs text-faint">XP</span>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-muted">No members yet.</li>}
      </ol>
    </div>
  );
}
