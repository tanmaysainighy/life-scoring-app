import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGroup, isMember, getGroupLeaderboard } from "@/lib/queries";
import { localDay } from "@/lib/dates";
import { Leaderboard } from "@/components/Leaderboard";
import { LeaveGroup } from "@/components/GroupActions";
import { Card } from "@/components/ui";
import { InviteCode } from "@/components/InviteCode";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const group = await getGroup(id);
  // Non-members get a 404 rather than a 403 — no group's existence is leaked.
  if (!group || !(await isMember(group.id, user.id))) notFound();

  const today = localDay(new Date(), user.timezone);
  const leaderboard = await getGroupLeaderboard(group.id, "week", today);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>{group.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted">{leaderboard.length} {leaderboard.length === 1 ? "member" : "members"}</p>
        </div>
        <LeaveGroup groupId={group.id} />
      </div>

      {group.description && <p className="text-sm text-muted">{group.description}</p>}

      <InviteCode code={group.invite_code} />

      <Card>
        <Leaderboard
          endpoint={`/api/groups/${group.id}/leaderboard`}
          initial={leaderboard}
          currentUserId={user.id}
        />
      </Card>
    </div>
  );
}
