import { route, ok, fail } from "@/lib/api";
import { getGroup, isMember, getGroupLeaderboard } from "@/lib/queries";
import { leaveGroup } from "@/lib/groups";
import { localDay } from "@/lib/dates";

export const GET = route(async ({ user, params }) => {
  const group = getGroup(params.id);
  if (!group) return fail("That group doesn't exist.", 404, "not_found");
  // Membership is the authorisation boundary: non-members see nothing.
  if (!isMember(group.id, user.id)) return fail("You're not a member of that group.", 403, "forbidden");

  return ok({
    group,
    leaderboard: getGroupLeaderboard(group.id, "week", localDay(new Date(), user.timezone)),
  });
});

export const DELETE = route(async ({ user, params }) => {
  const result = leaveGroup(user.id, params.id);
  return result.ok ? ok({ left: true }) : fail(result.error ?? "Couldn't leave that group.", 400);
}, { limit: "write" });
