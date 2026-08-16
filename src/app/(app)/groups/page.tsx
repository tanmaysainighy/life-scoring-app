import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserGroups, getGlobalLeaderboard } from "@/lib/queries";
import { localDay } from "@/lib/dates";
import { GroupActions } from "@/components/GroupActions";
import { Leaderboard } from "@/components/Leaderboard";
import { Card, SectionTitle, EmptyState } from "@/components/ui";

export const metadata = { title: "Groups · LifeScore" };
export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireUser();
  const today = localDay(new Date(), user.timezone);
  const [groups, global] = await Promise.all([
    getUserGroups(user.id, today),
    getGlobalLeaderboard("week", today),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Groups</h1>

      <GroupActions />

      <Card>
        <SectionTitle>Your groups</SectionTitle>
        {groups.length === 0 ? (
          <EmptyState icon="🤝" title="No groups yet" body="Create one for your friends, or join theirs with an invite code." />
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/groups/${group.id}`} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="text-xl" aria-hidden>{group.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{group.name}</p>
                    <p className="text-xs text-faint">{group.members} {group.members === 1 ? "member" : "members"}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold">#{group.rank}</p>
                    <p className="tabular text-xs text-faint">{group.xp.toLocaleString()} XP this week</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>Everyone on LifeScore</SectionTitle>
        <Leaderboard endpoint="/api/leaderboard" initial={global} currentUserId={user.id} />
      </Card>
    </div>
  );
}
