import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/queries";
import { formatDuration } from "@/lib/duration";
import { Card, SectionTitle, ProgressBar, Avatar, Stat } from "@/components/ui";
import { XpBars, CategoryBars } from "@/components/Charts";

export const metadata = { title: "Profile · LifeScore" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const { totals, streak, level, series, categories, topActivities, groups, achievements } = await getProfile(user);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} hue={user.avatar_hue} size={56} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted">Level {level.level} · {unlocked.length} achievements</p>
        </div>
      </div>

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular text-sm font-medium">
            {level.isMax ? "Top level" : `${totals.lifetime.toLocaleString()} / ${level.nextLevelAt!.toLocaleString()} XP`}
          </p>
          <p className="tabular text-sm">
            <span aria-hidden>🔥</span> {streak.current} day streak
          </p>
        </div>
        <ProgressBar percent={level.percent} className="mt-3" />
        <p className="mt-1.5 text-xs text-faint">
          {level.isMax ? "Nothing left to climb." : `${level.xpToNext.toLocaleString()} XP to level ${level.level + 1}`}
          {streak.longest > streak.current && ` · longest streak ${streak.longest} days`}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="!p-4"><Stat label="Today" value={totals.today.toLocaleString()} /></Card>
        <Card className="!p-4"><Stat label="This week" value={totals.week.toLocaleString()} /></Card>
        <Card className="!p-4"><Stat label="This month" value={totals.month.toLocaleString()} /></Card>
        <Card className="!p-4"><Stat label="Lifetime" value={totals.lifetime.toLocaleString()} /></Card>
      </div>

      <Card>
        <SectionTitle>Last 14 days</SectionTitle>
        <XpBars series={series} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Where your time goes</SectionTitle>
          <CategoryBars categories={categories} />
        </Card>

        <Card>
          <SectionTitle>Most logged</SectionTitle>
          {topActivities.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y">
              {topActivities.map((activity) => (
                <li key={activity.name} className="flex items-center gap-3 py-2 first:pt-0">
                  <span aria-hidden>{activity.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{activity.name}</span>
                  <span className="tabular text-xs text-faint">{formatDuration(activity.minutes)}</span>
                  <span className="tabular w-14 text-right text-sm font-semibold">{activity.xp.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>Achievements</SectionTitle>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {achievements.map((achievement) => (
            <li
              key={achievement.id}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                achievement.unlocked ? "" : "opacity-40"
              }`}
            >
              <span className="text-lg" aria-hidden>{achievement.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{achievement.name}</p>
                <p className="truncate text-[0.6875rem] text-faint">{achievement.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle>Groups</SectionTitle>
        {groups.length === 0 ? (
          <p className="py-2 text-sm text-muted">
            You're not in any groups. <Link href="/groups" className="text-accent hover:underline">Find one →</Link>
          </p>
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="flex items-center gap-3 py-2 first:pt-0">
                  <span aria-hidden>{group.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{group.name}</span>
                  <span className="tabular text-sm font-semibold">#{group.rank}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
