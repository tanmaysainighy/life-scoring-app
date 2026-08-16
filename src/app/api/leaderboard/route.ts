import { route, ok } from "@/lib/api";
import { getGlobalLeaderboard, type LeaderboardPeriod } from "@/lib/queries";
import { localDay } from "@/lib/dates";

const PERIODS: LeaderboardPeriod[] = ["today", "week", "month", "all"];

export const GET = route(async ({ user, request }) => {
  const requested = new URL(request.url).searchParams.get("period") as LeaderboardPeriod | null;
  const period: LeaderboardPeriod = requested && PERIODS.includes(requested) ? requested : "week";
  return ok({ period, leaderboard: await getGlobalLeaderboard(period, localDay(new Date(), user.timezone)) });
});
