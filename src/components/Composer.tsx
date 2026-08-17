"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatDuration } from "@/lib/duration";
import { Glyph } from "./ui";

/**
 * The one input that matters.
 *
 * Two steps, both server-authoritative: `analyze` interprets the text and
 * returns a proposal; `confirm` re-derives the score and stores it. The client
 * never sends or computes XP — it only displays what the server returned.
 *
 * When nothing is recognised the user can pick the activity themselves. That
 * always works, with or without a model, and the server remembers the phrasing
 * so the same words resolve on their own next time.
 */

type ActivityOption = {
  id: string; name: string; category: string; icon: string; base_xp_per_hour: number;
};

type Proposal = {
  status: "ready" | "confirm";
  activity: ActivityOption;
  durationMinutes: number;
  xp: number;
  formula: string;
  confidence: number;
  method: string;
  note: string | null;
};

type AnalyzeResponse =
  | Proposal
  | { status: "need_duration"; activity: ActivityOption; message: string }
  | { status: "clarify"; message: string; durationMinutes?: number | null }
  | { status: "error"; message: string };

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120, 180, 240];

export function Composer({ lifetimeXp }: { lifetimeXp: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [floating, setFloating] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [needsAck, setNeedsAck] = useState(false);
  const [picking, setPicking] = useState(false);
  const [parsedDuration, setParsedDuration] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function reset() {
    setResult(null);
    setMessage(null);
    setNeedsAck(false);
    setPicking(false);
    setParsedDuration(null);
  }

  // Submit with ⌘/Ctrl+Enter from anywhere in the box.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void analyze();
    }
  }

  async function analyze() {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    setMessage(null);
    setPicking(false);
    try {
      const response = await fetch("/api/activity/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: raw }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Couldn't analyse that right now. Try again." });
        return;
      }
      const data = payload.data as AnalyzeResponse;

      if (data.status === "clarify" || data.status === "error") {
        setMessage({ tone: data.status === "error" ? "error" : "info", text: data.message });
        setResult(null);
        setParsedDuration(data.status === "clarify" ? data.durationMinutes ?? null : null);
        return;
      }
      setResult(data);
    } catch {
      setMessage({ tone: "error", text: "Couldn't reach the server. Your text is still here — try again." });
    } finally {
      setBusy(false);
    }
  }

  /** Turns a chosen activity + duration into a proposal for the preview card. */
  function propose(activity: ActivityOption, minutes: number): Proposal {
    return {
      status: "confirm",
      activity,
      durationMinutes: minutes,
      xp: Math.round((activity.base_xp_per_hour * minutes) / 60),
      formula: "",
      confidence: 1,
      method: "manual",
      note: null,
    };
  }

  function pickActivity(activity: ActivityOption) {
    setPicking(false);
    setMessage(null);
    if (parsedDuration) {
      setResult(propose(activity, parsedDuration));
    } else {
      setResult({ status: "need_duration", activity, message: `${activity.name}. How long did you spend on it?` });
    }
  }

  async function confirm(proposal: Proposal, acknowledged = false) {
    setBusy(true);
    try {
      const response = await fetch("/api/activity/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: proposal.activity.id,
          duration_minutes: proposal.durationMinutes,
          raw_text: text.trim(),
          method: proposal.method,
          confidence: proposal.confidence,
          acknowledged,
          previous_lifetime_xp: lifetimeXp,
        }),
      });
      const payload = await response.json();

      if (response.status === 409) {
        // A "are you sure?" check, not a failure — offer to go ahead.
        setMessage({ tone: "info", text: payload.error });
        setResult({ ...proposal, status: "confirm", note: payload.error });
        setNeedsAck(true);
        return;
      }
      if (!response.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Something went wrong saving your activity." });
        return;
      }

      setFloating(payload.data.xp);
      if (payload.data.levelled_up) setLevelUp(payload.data.level);
      setText("");
      reset();
      startTransition(() => router.refresh());
      inputRef.current?.focus();
    } catch {
      setMessage({ tone: "error", text: "Something went wrong saving your activity. Your entry hasn't been lost — try again." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (floating === null) return;
    const timer = setTimeout(() => setFloating(null), 1100);
    return () => clearTimeout(timer);
  }, [floating]);

  useEffect(() => {
    if (levelUp === null) return;
    const timer = setTimeout(() => setLevelUp(null), 2600);
    return () => clearTimeout(timer);
  }, [levelUp]);

  return (
    <div className="relative">
      <div className="card overflow-hidden">
        <div className="p-4 sm:p-5">
          <label htmlFor="composer" className="label">
            What did you do?
          </label>
          <textarea
            id="composer"
            ref={inputRef}
            rows={2}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Worked on my AI agent for 4 hours…"
            maxLength={500}
            className="mt-2 w-full resize-none bg-transparent text-[1.0625rem] leading-relaxed outline-none placeholder:text-faint"
          />

          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="hidden text-xs text-faint sm:block">
              Plain language works best. ⌘↵ to send.
            </span>
            <button
              onClick={analyze}
              disabled={busy || text.trim().length < 2}
              className="btn btn-primary ml-auto"
            >
              {busy && !result ? "Reading…" : "Add XP"}
            </button>
          </div>
        </div>

        {message && (
          <div className={`rise border-t px-4 py-3 sm:px-5 ${message.tone === "error" ? "text-warn" : "text-muted"}`}>
            <p className="text-sm">{message.text}</p>
            {message.tone === "info" && !picking && !result && (
              <button onClick={() => setPicking(true)} className="btn btn-outline mt-3 text-xs">
                Choose it myself
              </button>
            )}
          </div>
        )}

        {picking && (
          <div className="rise border-t p-4 sm:p-5">
            <ActivityPicker onSelect={pickActivity} />
            <button onClick={() => setPicking(false)} className="btn btn-ghost mt-3 text-xs">Cancel</button>
          </div>
        )}

        {result?.status === "need_duration" && (
          <DurationStep
            activity={result.activity}
            message={result.message}
            onPick={(minutes) => setResult(propose(result.activity, minutes))}
          />
        )}

        {(result?.status === "ready" || result?.status === "confirm") && (
          <Preview
            proposal={result}
            busy={busy}
            needsAck={needsAck}
            onChange={(next) => setResult(next)}
            onConfirm={() => confirm(result, needsAck)}
            onCancel={reset}
          />
        )}
      </div>

      {floating !== null && (
        <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
          <span className="xp-float text-lg font-semibold text-accent-text">+{floating} XP</span>
        </div>
      )}

      {levelUp !== null && <LevelUpBurst level={levelUp} />}
    </div>
  );
}

/**
 * Searchable list of every canonical activity. The list is fetched on first
 * open only — it isn't part of the dashboard payload.
 */
function ActivityPicker({ onSelect }: { onSelect: (activity: ActivityOption) => void }) {
  const [options, setOptions] = useState<ActivityOption[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/activities")
      .then((response) => response.json())
      .then((payload) => setOptions(payload.data?.activities ?? []))
      .catch(() => setOptions([]));
  }, []);

  const filtered = (options ?? [])
    .filter((option) => option.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  return (
    <div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search activities…"
        aria-label="Search activities"
        className="field py-1.5 text-sm"
        autoFocus
      />
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border">
        {options === null && <div className="skeleton m-2 h-8" />}
        {filtered.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent-soft"
          >
            <span aria-hidden>{option.icon}</span>
            <span className="flex-1 truncate">{option.name}</span>
            <span className="tabular text-xs text-faint">{option.base_xp_per_hour} XP/h</span>
          </button>
        ))}
        {options !== null && filtered.length === 0 && (
          <p className="px-3 py-3 text-sm text-muted">No activity matches that.</p>
        )}
      </div>
    </div>
  );
}

function DurationStep({
  activity, message, onPick,
}: {
  activity: ActivityOption;
  message: string;
  onPick: (minutes: number) => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div className="rise border-t p-4 sm:p-5">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_MINUTES.map((minutes) => (
          <button key={minutes} onClick={() => onPick(minutes)} className="btn btn-outline px-3 py-1.5 text-xs">
            {formatDuration(minutes)}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const minutes = Number(custom);
          if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440) onPick(Math.round(minutes));
        }}
      >
        <input
          type="number" min={1} max={1440} value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Minutes"
          className="field max-w-32 py-1.5 text-sm"
          aria-label={`Minutes spent on ${activity.name}`}
        />
        <button type="submit" className="btn btn-outline text-xs">Use</button>
      </form>
    </div>
  );
}

function Preview({
  proposal, busy, needsAck, onChange, onConfirm, onCancel,
}: {
  proposal: Proposal;
  busy: boolean;
  needsAck: boolean;
  onChange: (next: Proposal) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const xp = Math.round((proposal.activity.base_xp_per_hour * proposal.durationMinutes) / 60);
  const hours = proposal.durationMinutes / 60;
  const hoursLabel = Number.isInteger(hours) ? hours : Number(hours.toFixed(2));

  return (
    <div className="rise border-t bg-raised p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Glyph icon={proposal.activity.icon} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{proposal.activity.name}</p>
          <p className="tabular mt-0.5 text-sm text-muted">
            {formatDuration(proposal.durationMinutes)} · {hoursLabel} h × {proposal.activity.base_xp_per_hour} XP/h
          </p>
        </div>
        <div className="pop text-right">
          <div className="figure text-3xl text-accent-text">+{xp}</div>
          <div className="label mt-0.5">XP</div>
        </div>
      </div>

      {proposal.status === "confirm" && !needsAck && proposal.method !== "manual" && (
        <p className="mt-3 text-sm text-muted">
          {proposal.note ?? "I think that's what you meant — check it before I save."}
        </p>
      )}
      {proposal.note && proposal.status === "ready" && (
        <p className="mt-3 text-sm text-muted">{proposal.note}</p>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-xl border p-3">
          <div>
            <label className="text-xs font-medium text-faint" htmlFor="edit-minutes">Duration (minutes)</label>
            <input
              id="edit-minutes"
              type="number" min={1} max={1440}
              value={proposal.durationMinutes}
              onChange={(event) =>
                onChange({ ...proposal, durationMinutes: Math.max(1, Math.min(1440, Number(event.target.value) || 1)) })
              }
              className="field mt-1 max-w-36 py-1.5 text-sm"
            />
          </div>
          <ActivityPicker
            onSelect={(activity) => {
              onChange({ ...proposal, activity, method: "manual", confidence: 1 });
              setEditing(false);
            }}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onConfirm} disabled={busy} className="btn btn-primary flex-1 sm:flex-none">
          {busy ? "Saving…" : needsAck ? "Log it anyway" : "Confirm"}
        </button>
        <button onClick={() => setEditing((value) => !value)} disabled={busy} className="btn btn-outline">
          {editing ? "Done" : "Edit"}
        </button>
        <button onClick={onCancel} disabled={busy} className="btn btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

function LevelUpBurst({ level }: { level: number }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 55%, transparent)" }}
      role="status"
    >
      <div className="pop card px-10 py-8 text-center" style={{ boxShadow: "var(--shadow-pop)" }}>
        <div className="label" style={{ color: "var(--accent-text)" }}>Level up</div>
        <div className="figure mt-2 text-6xl" style={{ color: "var(--accent-text)" }}>{level}</div>
        <div className="mt-2 text-sm text-muted">Nicely done.</div>
      </div>
    </div>
  );
}
