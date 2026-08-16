import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { greetingFor } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { Composer } from "@/components/Composer";
import { ActivityList } from "@/components/ActivityList";
import { Card, SectionTitle, ProgressBar, EmptyState, Stat } from "@/components/ui";

export const metadata = { title: "LifeScore" };
// Session-dependent, so always rendered fresh — but from local queries, not
// from any network call. No LLM is involved in loading this page.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const { totals, streak, level, logs, groups } = getDashboard(user);
  const minutesToday = logs.reduce((sum, log) => sum + log.duration_minutes, 0);

  return (
    <div className="space-y-6">
      <section className="rise">
        <p className="text-sm text-muted">
          {greetingFor(new Date(), user.timezone)}, {user.name.split(" ")[0]} 👋
        </p>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Level {level.level}</h1>
            <p className="tabular mt-1 text-sm text-muted">
              {level.isMax
                ? `${totals.lifetime.toLocaleString()} XP — top level`
                : `${totals.lifetime.toLocaleString()} / ${level.nextLevelAt!.toLocaleString()} XP`}
            </p>
          </div>
          <StreakBadge current={streak.current} atRisk={streak.atRisk} />
        </div>

        <ProgressBar percent={level.percent} className="mt-4" />
        {!level.isMax && (
          <p className="tabular mt-1.5 text-xs text-faint">{level.xpToNext.toLocaleString()} XP to level {level.level + 1}</p>
        )}
      </section>

      <Composer lifetimeXp={totals.lifetime} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-4"><Stat label="Today" value={totals.today.toLocaleString()} hint={minutesToday ? formatDuration(minutesToday) + " logged" : "nothing yet"} /></Card>
        <Card className="!p-4"><Stat label="This week" value={totals.week.toLocaleString()} hint="XP since Monday" /></Card>
        <Card className="!p-4"><Stat label="Lifetime" value={totals.lifetime.toLocaleString()} hint={`${totals.entries} ${totals.entries === 1 ? "entry" : "entries"}`} /></Card>
      </div>

      <Card>
        <SectionTitle action={<Link href="/log" className="text-xs font-medium text-accent hover:underline">All activity</Link>}>
          Today
        </SectionTitle>
        <ActivityList logs={logs} emptyBody="Describe something you did above and it'll show up here." />
      </Card>

      <Card>
        <SectionTitle action={<Link href="/groups" className="text-xs font-medium text-accent hover:underline">Manage</Link>}>
          Your groups
        </SectionTitle>
        {groups.length === 0 ? (
          <EmptyState icon="🏆" title="No groups yet" body="Create one or join with an invite code to start competing." />
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <span className="text-lg" aria-hidden>{group.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">{group.name}</p>
                    <p className="text-xs text-faint">{group.members} {group.members === 1 ? "member" : "members"}</p>
                  </div>
                  <span className="tabular text-sm font-semibold">#{group.rank}</span>
                  <span className="text-xs text-faint">this week</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StreakBadge({ current, atRisk }: { current: number; atRisk: boolean }) {
  if (current === 0) {
    return (
      <div className="text-right">
        <p className="text-sm text-muted">No streak yet</p>
        <p className="text-xs text-faint">Earn 10+ XP today — rest and screen time don't count</p>
      </div>
    );
  }
  return (
    <div className="text-right">
      <p className="tabular text-lg font-semibold">
        <span aria-hidden>🔥</span> {current} day{current === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-faint">{atRisk ? "Log something today to keep it" : "Streak safe for today"}</p>
    </div>
  );
}
