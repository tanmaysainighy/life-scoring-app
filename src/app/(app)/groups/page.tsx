import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserGroups, getGlobalLeaderboard, type LeaderboardPeriod } from "@/lib/queries";
import { localDay } from "@/lib/dates";
import { GroupActions } from "@/components/GroupActions";
import { Leaderboard } from "@/components/Leaderboard";
import { Section } from "@/components/Section";

export const metadata = { title: "Groups · LifeScore" };
export const dynamic = "force-dynamic";

const PERIODS: LeaderboardPeriod[] = ["today", "week", "month", "all"];

export default async function GroupsPage({
  searchParams,
}: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireUser();
  const requested = (await searchParams).period as LeaderboardPeriod | undefined;
  const period: LeaderboardPeriod = requested && PERIODS.includes(requested) ? requested : "week";
  const today = localDay(new Date(), user.timezone);

  const [groups, global] = await Promise.all([
    getUserGroups(user.id, today),
    getGlobalLeaderboard(period, today),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-heading enter">Groups</h1>

      <div className="enter mt-10" style={{ "--i": 1 } as React.CSSProperties}>
        {groups.length === 0 ? (
          <div>
            <p className="t-secondary max-w-sm text-[0.9375rem]">
              Competing with people you know is the point. Start a group and share the code,
              or join one you&rsquo;ve been given.
            </p>
            <div className="mt-6"><GroupActions /></div>
          </div>
        ) : (
          <Section title="Yours">
            <ul>
              {groups.map((group) => (
                <li key={group.id} className="rule-b last:border-b-0">
                  <Link href={`/groups/${group.id}`} className="tap flex items-baseline gap-4 py-3.5">
                    <span aria-hidden className="text-[0.9375rem]">{group.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{group.name}</span>
                      <span className="t-meta">{group.members} {group.members === 1 ? "member" : "members"}</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular t-figure block text-[0.9375rem]">#{group.rank}</span>
                      <span className="tabular t-meta">{group.xp.toLocaleString()} XP</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8"><GroupActions /></div>
          </Section>
        )}
      </div>

      <div className="enter mt-16" style={{ "--i": 2 } as React.CSSProperties}>
        <Section title="Everyone">
          <Leaderboard rows={global} period={period} basePath="/groups" currentUserId={user.id} />
        </Section>
      </div>
    </div>
  );
}
