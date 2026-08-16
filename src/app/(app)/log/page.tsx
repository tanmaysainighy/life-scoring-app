import { requireUser } from "@/lib/auth";
import { getRecentLogs } from "@/lib/queries";
import { ActivityList } from "@/components/ActivityList";
import { Card } from "@/components/ui";
import { formatDuration } from "@/lib/duration";

export const metadata = { title: "Activity log · LifeScore" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function LogPage({
  searchParams,
}: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const logs = await getRecentLogs(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  // Group by the day the user actually lived, newest first.
  const days = new Map<string, typeof logs>();
  for (const log of logs) {
    const existing = days.get(log.local_day);
    if (existing) existing.push(log);
    else days.set(log.local_day, [log]);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>

      {days.size === 0 && (
        <Card><p className="py-6 text-center text-sm text-muted">Nothing logged yet.</p></Card>
      )}

      {[...days].map(([day, dayLogs]) => {
        const xp = dayLogs.reduce((sum, log) => sum + log.xp, 0);
        const minutes = dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
        return (
          <Card key={day}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold">{formatDay(day)}</h2>
              <p className="tabular text-xs text-faint">{formatDuration(minutes)} · <span className="font-semibold text-accent">+{xp} XP</span></p>
            </div>
            <ActivityList logs={dayLogs} emptyBody="" />
          </Card>
        );
      })}

      {(page > 1 || logs.length === PAGE_SIZE) && (
        <div className="flex justify-between">
          {page > 1
            ? <a href={`/log?page=${page - 1}`} className="btn btn-outline">Newer</a>
            : <span />}
          {logs.length === PAGE_SIZE && <a href={`/log?page=${page + 1}`} className="btn btn-outline">Older</a>}
        </div>
      )}
    </div>
  );
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  });
}
