"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDuration, formatDurationLong } from "@/lib/duration";
import { EmptyState } from "./ui";

/**
 * Activity rows with the score explanation, editing and deletion.
 * Edits go back through the server's scoring engine — nothing is recalculated
 * here, the row just re-renders with what came back.
 */

export type LogItem = {
  id: string;
  raw_text: string;
  duration_minutes: number;
  xp: number;
  base_xp_per_hour: number;
  scoring_version: number;
  created_at: string;
  activity_name: string;
  activity_icon: string;
};

export function ActivityList({ logs, emptyBody }: { logs: LogItem[]; emptyBody: string }) {
  if (logs.length === 0) {
    return <EmptyState icon="🌤️" title="Nothing logged yet" body={emptyBody} />;
  }
  return (
    <ul className="divide-y">
      {logs.map((log) => <Row key={log.id} log={log} />)}
    </ul>
  );
}

function Row({ log }: { log: LogItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(log.duration_minutes);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/activity/${log.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration_minutes: minutes }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? "Couldn't save that change.");
      setBusy(false);
      return;
    }
    setEditing(false);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const response = await fetch(`/api/activity/${log.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError("Couldn't delete that entry.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="text-lg leading-none" aria-hidden>{log.activity_icon}</span>
        <button
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
        >
          <p className="truncate text-[0.9375rem] font-medium">{log.activity_name}</p>
          <p className="tabular truncate text-xs text-faint">
            {formatDuration(log.duration_minutes)} · {log.raw_text}
          </p>
        </button>
        <span className="tabular shrink-0 text-sm font-semibold text-accent">+{log.xp}</span>
      </div>

      {open && (
        <div className="rise mt-2 ml-8 rounded-xl border bg-raised p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint">Scored using</p>
          <p className="mt-1">
            {log.activity_name} — <span className="tabular">{log.base_xp_per_hour} XP/hour</span>
          </p>
          <p className="tabular mt-1 text-muted">
            {formatDurationLong(log.duration_minutes)} × {log.base_xp_per_hour} XP/h ={" "}
            <span className="font-semibold text-ink">{log.xp} XP</span>
          </p>
          <p className="mt-1 text-xs text-faint">Scoring rules v{log.scoring_version}</p>

          {editing ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="number" min={1} max={1440} value={minutes}
                onChange={(event) => setMinutes(Math.max(1, Math.min(1440, Number(event.target.value) || 1)))}
                className="field max-w-28 py-1 text-sm"
                aria-label="Duration in minutes"
              />
              <button onClick={save} disabled={busy} className="btn btn-primary px-3 py-1 text-xs">Save</button>
              <button onClick={() => { setEditing(false); setMinutes(log.duration_minutes); }} className="btn btn-ghost px-2 py-1 text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(true)} className="btn btn-outline px-3 py-1 text-xs">Edit</button>
              <button onClick={remove} disabled={busy} className="btn btn-ghost px-3 py-1 text-xs">Delete</button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-warn">{error}</p>}
        </div>
      )}
    </li>
  );
}
