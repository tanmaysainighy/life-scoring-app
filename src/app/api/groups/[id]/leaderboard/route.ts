import { route, ok, fail } from "@/lib/api";
import { getGroupLeaderboard, isMember, type LeaderboardPeriod } from "@/lib/queries";
import { localDay } from "@/lib/dates";

const PERIODS: LeaderboardPeriod[] = ["today", "week", "month", "all"];

export const GET = route(async ({ user, request, params }) => {
  if (!isMember(params.id, user.id)) return fail("You're not a member of that group.", 403, "forbidden");

  const requested = new URL(request.url).searchParams.get("period") as LeaderboardPeriod | null;
  const period: LeaderboardPeriod = requested && PERIODS.includes(requested) ? requested : "week";

  return ok({
    period,
    leaderboard: getGroupLeaderboard(params.id, period, localDay(new Date(), user.timezone)),
  });
});
