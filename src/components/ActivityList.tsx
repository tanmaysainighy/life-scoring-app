"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDuration, formatDurationLong } from "@/lib/duration";
import { EmptyState, Glyph } from "./ui";

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
    <ul className="flex flex-col gap-0.5">
      {logs.map((log, index) => <Row key={log.id} log={log} index={index} />)}
    </ul>
  );
}

function Row({ log, index }: { log: LogItem; index: number }) {
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
    <li className="rise" style={{ "--i": index } as React.CSSProperties}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="press -mx-2 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-raised"
      >
        <Glyph icon={log.activity_icon} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{log.activity_name}</span>
          <span className="tabular block truncate text-xs text-faint">
            {formatDuration(log.duration_minutes)} · {log.raw_text}
          </span>
        </span>
        <span className="figure shrink-0 text-lg text-accent-text">+{log.xp}</span>
      </button>

      {open && (
        <div className="rise ml-12 mt-1 mb-1 rounded-xl border bg-raised p-3.5 text-sm">
          <p className="label">Scored using</p>
          <p className="mt-1.5 font-medium">
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
              <button onClick={save} disabled={busy} className="btn btn-primary btn-sm">Save</button>
              <button
                onClick={() => { setEditing(false); setMinutes(log.duration_minutes); }}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(true)} className="btn btn-outline btn-sm">Edit</button>
              <button onClick={remove} disabled={busy} className="btn btn-ghost btn-sm">Delete</button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-warn">{error}</p>}
        </div>
      )}
    </li>
  );
}
