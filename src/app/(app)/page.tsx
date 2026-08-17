import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { greetingFor } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { Composer } from "@/components/Composer";
import { ActivityList } from "@/components/ActivityList";
import { CountUp } from "@/components/CountUp";
import { Card, SectionTitle, EmptyState, LevelArc, Glyph } from "@/components/ui";

export const metadata = { title: "LifeScore" };
// Session-dependent, so always rendered fresh — but from local queries, not
// from any network call. No LLM is involved in loading this page.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const { totals, streak, level, logs, groups } = await getDashboard(user);
  const minutesToday = logs.reduce((sum, log) => sum + log.duration_minutes, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {/* --- primary column ------------------------------------------------ */}
      <div className="flex flex-col gap-5">
        <section className="rise card overflow-hidden">
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-6">
            <LevelArc level={level.level} percent={level.percent} />

            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">
                {greetingFor(new Date(), user.timezone)}, {user.name.split(" ")[0]}
              </p>

              <div className="mt-1 flex items-end gap-2.5">
                <span className="figure text-[3.25rem] sm:text-[4rem]">
                  <CountUp value={totals.today} />
                </span>
                <span className="label mb-2.5">XP today</span>
              </div>

              <p className="tabular mt-1 text-sm text-muted">
                {level.isMax
                  ? `${totals.lifetime.toLocaleString()} XP — top level`
                  : <>{level.xpToNext.toLocaleString()} XP to level {level.level + 1}</>}
                {minutesToday > 0 && <> · {formatDuration(minutesToday)} logged</>}
              </p>
            </div>

            <StreakBadge current={streak.current} atRisk={streak.atRisk} />
          </div>
        </section>

        <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <Composer lifetimeXp={totals.lifetime} />
        </div>

        <Card className="rise" >
          <SectionTitle action={
            <Link href="/log" className="text-xs font-medium text-accent-text hover:underline">All activity →</Link>
          }>
            Today
          </SectionTitle>
          <ActivityList logs={logs} emptyBody="Describe something you did above and it'll show up here." />
        </Card>
      </div>

      {/* --- side column --------------------------------------------------- */}
      <div className="flex flex-col gap-5">
        <Card className="rise" >
          <SectionTitle>This week</SectionTitle>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
            <MiniStat label="Week" value={totals.week} />
            <MiniStat label="Month" value={totals.month} />
            <MiniStat label="Lifetime" value={totals.lifetime} hint={`${totals.entries} ${totals.entries === 1 ? "entry" : "entries"}`} />
          </div>
        </Card>

        <Card className="rise">
          <SectionTitle action={
            <Link href="/groups" className="text-xs font-medium text-accent-text hover:underline">Manage</Link>
          }>
            Your groups
          </SectionTitle>
          {groups.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No groups yet"
              body="Create one or join with an invite code to start competing."
              action={<Link href="/groups" className="btn btn-outline btn-sm mt-3">Find a group</Link>}
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {groups.map((group, index) => (
                <li key={group.id} className="rise" style={{ "--i": index } as React.CSSProperties}>
                  <Link
                    href={`/groups/${group.id}`}
                    className="press -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-raised"
                  >
                    <Glyph icon={group.emoji} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium">{group.name}</p>
                      <p className="text-xs text-faint">{group.members} {group.members === 1 ? "member" : "members"}</p>
                    </div>
                    <div className="text-right">
                      <p className="figure text-lg">#{group.rank}</p>
                      <p className="label text-[0.5625rem]">this week</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="lg:flex lg:items-baseline lg:justify-between lg:gap-3">
      <div className="label lg:mb-0">{label}</div>
      <div className="figure mt-1.5 text-2xl lg:mt-0">{value.toLocaleString()}</div>
      {hint && <div className="mt-0.5 text-[0.6875rem] text-faint lg:hidden">{hint}</div>}
    </div>
  );
}

function StreakBadge({ current, atRisk }: { current: number; atRisk: boolean }) {
  if (current === 0) {
    return (
      <div className="shrink-0 rounded-2xl border border-dashed px-4 py-3 text-center">
        <p className="text-sm font-medium text-muted">No streak</p>
        <p className="mt-0.5 max-w-[9rem] text-xs text-faint">Earn 10+ XP today to start one</p>
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-2xl px-4 py-3 text-center"
      style={{ background: "color-mix(in srgb, var(--flame) 12%, transparent)" }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className={atRisk ? "" : "flame-live"} aria-hidden>🔥</span>
        <span className="figure text-2xl" style={{ color: "var(--flame)" }}>{current}</span>
      </div>
      <p className="mt-1 text-[0.6875rem] font-medium" style={{ color: "var(--flame)" }}>
        day{current === 1 ? "" : "s"}
      </p>
      <p className="mt-0.5 max-w-[9rem] text-[0.6875rem] text-faint">
        {atRisk ? "Log today to keep it" : "Safe for today"}
      </p>
    </div>
  );
}
