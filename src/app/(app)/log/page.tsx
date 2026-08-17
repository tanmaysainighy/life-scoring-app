import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRecentLogs } from "@/lib/queries";
import { Timeline } from "@/components/Timeline";
import { Section } from "@/components/Section";
import { formatDuration } from "@/lib/duration";

export const metadata = { title: "History · LifeScore" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function LogPage({
  searchParams,
}: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const logs = await getRecentLogs(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  // Grouped by the day the user actually lived, newest first.
  const days = new Map<string, typeof logs>();
  for (const log of logs) {
    const existing = days.get(log.local_day);
    if (existing) existing.push(log);
    else days.set(log.local_day, [log]);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-heading enter">History</h1>

      {days.size === 0 && (
        <p className="t-secondary enter mt-8 text-[0.9375rem]">
          Nothing here yet. <Link href="/" className="underline underline-offset-2 hover:text-ink">Log something</Link>.
        </p>
      )}

      <div className="mt-10 flex flex-col gap-12">
        {[...days].map(([day, dayLogs], index) => {
          const xp = dayLogs.reduce((sum, log) => sum + log.xp, 0);
          const minutes = dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0);
          return (
            <div key={day} className="enter" style={{ "--i": index } as React.CSSProperties}>
              <Section
                title={formatDay(day)}
                meta={<span className="tabular">{formatDuration(minutes)} · {xp.toLocaleString()} XP</span>}
              >
                <Timeline entries={dayLogs} timezone={user.timezone} />
              </Section>
            </div>
          );
        })}
      </div>

      {(page > 1 || logs.length === PAGE_SIZE) && (
        <div className="rule-t mt-14 flex justify-between pt-5">
          {page > 1
            ? <Link href={`/log?page=${page - 1}`} className="btn btn-quiet btn-sm">Newer</Link>
            : <span />}
          {logs.length === PAGE_SIZE && (
            <Link href={`/log?page=${page + 1}`} className="btn btn-quiet btn-sm">Older</Link>
          )}
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
