import "./seed";
import { all, get } from "./db";
import { localDay, startOfWeek, startOfMonth, addDays } from "./dates";
import { computeStreak, MIN_STREAK_XP, NON_STREAK_CATEGORY } from "./streak";
import { getLevelProgress } from "./levels";
import { evaluateAchievements, ACHIEVEMENTS } from "./achievements";
import { cached } from "./cache";

/**
 * Read models for the UI. Every total is computed by the database with an
 * aggregate over an indexed range — nothing loops over rows in JavaScript.
 */

export type SessionUser = {
  id: string; name: string; email: string; avatar_hue: number; timezone: string; is_admin: number;
};

export type LogRow = {
  id: string;
  raw_text: string;
  duration_minutes: number;
  xp: number;
  base_xp_per_hour: number;
  scoring_version: number;
  created_at: string;
  local_day: string;
  activity_id: string;
  activity_name: string;
  activity_icon: string;
  category: string;
};

const LOG_SELECT = `
  SELECT l.id, l.raw_text, l.duration_minutes, l.xp, l.base_xp_per_hour, l.scoring_version,
         l.created_at, l.local_day, l.activity_id,
         a.name AS activity_name, a.icon AS activity_icon, a.category
    FROM activity_logs l
    JOIN activities a ON a.id = l.activity_id`;

/** Today / week / month / lifetime in a single pass over the user's index. */
export function getTotals(userId: string, today: string) {
  const row = get<{
    today: number; week: number; month: number; lifetime: number;
    entries: number; distinct_activities: number; total_minutes: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN local_day = ?  THEN xp END), 0) AS today,
       COALESCE(SUM(CASE WHEN local_day >= ? THEN xp END), 0) AS week,
       COALESCE(SUM(CASE WHEN local_day >= ? THEN xp END), 0) AS month,
       COALESCE(SUM(xp), 0)                                   AS lifetime,
       COUNT(*)                                               AS entries,
       COUNT(DISTINCT activity_id)                            AS distinct_activities,
       COALESCE(SUM(duration_minutes), 0)                     AS total_minutes
     FROM activity_logs WHERE user_id = ?`,
    today, startOfWeek(today), startOfMonth(today), userId,
  );
  return row ?? {
    today: 0, week: 0, month: 0, lifetime: 0, entries: 0, distinct_activities: 0, total_minutes: 0,
  };
}

/**
 * Only the day labels that cleared the streak threshold come back.
 * Rest-category activities are excluded, so a long night's sleep or a TV binge
 * is still tracked but never keeps a streak alive on its own.
 */
export function getStreak(userId: string, today: string) {
  const days = all<{ local_day: string }>(
    `SELECT l.local_day
       FROM activity_logs l
       JOIN activities a ON a.id = l.activity_id
      WHERE l.user_id = ? AND a.category != ?
      GROUP BY l.local_day HAVING SUM(l.xp) >= ?`,
    userId, NON_STREAK_CATEGORY, MIN_STREAK_XP,
  ).map((row) => row.local_day);
  return computeStreak(days, today);
}

export function getLogsForDay(userId: string, day: string): LogRow[] {
  return all<LogRow>(
    `${LOG_SELECT} WHERE l.user_id = ? AND l.local_day = ? ORDER BY l.created_at DESC`,
    userId, day,
  );
}

export function getRecentLogs(userId: string, limit = 50, offset = 0): LogRow[] {
  return all<LogRow>(
    `${LOG_SELECT} WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    userId, limit, offset,
  );
}

export function getLog(userId: string, logId: string): LogRow | undefined {
  return get<LogRow>(`${LOG_SELECT} WHERE l.user_id = ? AND l.id = ?`, userId, logId);
}

/** XP per day for the last `days` days, zero-filled for the chart. */
export function getDailySeries(userId: string, today: string, days = 14) {
  const from = addDays(today, -(days - 1));
  const rows = all<{ local_day: string; xp: number }>(
    `SELECT local_day, SUM(xp) AS xp FROM activity_logs
      WHERE user_id = ? AND local_day >= ? GROUP BY local_day`,
    userId, from,
  );
  const byDay = new Map(rows.map((row) => [row.local_day, row.xp]));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(from, index);
    return { day, xp: byDay.get(day) ?? 0 };
  });
}

export function getCategoryBreakdown(userId: string, since?: string) {
  return all<{ category: string; xp: number; minutes: number }>(
    `SELECT a.category, SUM(l.xp) AS xp, SUM(l.duration_minutes) AS minutes
       FROM activity_logs l JOIN activities a ON a.id = l.activity_id
      WHERE l.user_id = ? ${since ? "AND l.local_day >= ?" : ""}
      GROUP BY a.category ORDER BY xp DESC`,
    ...(since ? [userId, since] : [userId]),
  );
}

export function getTopActivities(userId: string, limit = 6) {
  return all<{ name: string; icon: string; xp: number; minutes: number; count: number }>(
    `SELECT a.name, a.icon, SUM(l.xp) AS xp, SUM(l.duration_minutes) AS minutes, COUNT(*) AS count
       FROM activity_logs l JOIN activities a ON a.id = l.activity_id
      WHERE l.user_id = ?
      GROUP BY a.id ORDER BY xp DESC LIMIT ?`,
    userId, limit,
  );
}

// --- groups ---------------------------------------------------------------

export type GroupSummary = {
  id: string; name: string; emoji: string; slug: string;
  members: number; xp: number; rank: number;
};

/** Every group the user is in, with their current weekly rank. One query. */
export function getUserGroups(userId: string, today: string): GroupSummary[] {
  return cached(`groups:${userId}:${today}`, 10_000, () =>
    all<GroupSummary>(
      `WITH mine AS (SELECT group_id FROM group_members WHERE user_id = ?),
            weekly AS (
              SELECT gm.group_id, gm.user_id, COALESCE(SUM(l.xp), 0) AS xp
                FROM group_members gm
                LEFT JOIN activity_logs l
                  ON l.user_id = gm.user_id AND l.local_day >= ?
               WHERE gm.group_id IN (SELECT group_id FROM mine)
               GROUP BY gm.group_id, gm.user_id
            ),
            ranked AS (
              SELECT group_id, user_id, xp,
                     RANK() OVER (PARTITION BY group_id ORDER BY xp DESC) AS rank
                FROM weekly
            )
       SELECT g.id, g.name, g.emoji, g.slug, r.xp, r.rank,
              (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS members
         FROM ranked r JOIN groups g ON g.id = r.group_id
        WHERE r.user_id = ?
        ORDER BY g.created_at DESC`,
      userId, startOfWeek(today), userId,
    ),
  );
}

export type LeaderboardPeriod = "today" | "week" | "month" | "all";

function periodStart(period: LeaderboardPeriod, today: string): string {
  switch (period) {
    case "today": return today;
    case "week": return startOfWeek(today);
    case "month": return startOfMonth(today);
    case "all": return "0000-01-01";
  }
}

export type LeaderboardRow = {
  user_id: string; name: string; avatar_hue: number; xp: number; entries: number;
};

/**
 * Server-side aggregation over the (user_id, local_day) index. The client never
 * submits XP and never computes a total.
 */
export function getGroupLeaderboard(
  groupId: string, period: LeaderboardPeriod, today: string,
): LeaderboardRow[] {
  return cached(`lb:${groupId}:${period}:${today}`, 15_000, () =>
    all<LeaderboardRow>(
      `SELECT u.id AS user_id, u.name, u.avatar_hue,
              COALESCE(SUM(l.xp), 0) AS xp,
              COUNT(l.id) AS entries
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         LEFT JOIN activity_logs l ON l.user_id = gm.user_id AND l.local_day >= ?
        WHERE gm.group_id = ?
        GROUP BY u.id
        ORDER BY xp DESC, u.name ASC
        LIMIT 100`,
      periodStart(period, today), groupId,
    ),
  );
}

/** Global leaderboard across all users. */
export function getGlobalLeaderboard(period: LeaderboardPeriod, today: string): LeaderboardRow[] {
  return cached(`lb:global:${period}:${today}`, 30_000, () =>
    all<LeaderboardRow>(
      `SELECT u.id AS user_id, u.name, u.avatar_hue,
              COALESCE(SUM(l.xp), 0) AS xp, COUNT(l.id) AS entries
         FROM users u
         LEFT JOIN activity_logs l ON l.user_id = u.id AND l.local_day >= ?
        GROUP BY u.id
        ORDER BY xp DESC, u.name ASC
        LIMIT 50`,
      periodStart(period, today),
    ),
  );
}

export function getGroup(groupId: string) {
  return get<{ id: string; name: string; slug: string; description: string; emoji: string; invite_code: string; owner_id: string; created_at: string }>(
    `SELECT id, name, slug, description, emoji, invite_code, owner_id, created_at FROM groups WHERE id = ?`,
    groupId,
  );
}

export function isMember(groupId: string, userId: string): boolean {
  return Boolean(get(`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?`, groupId, userId));
}

// --- composed views -------------------------------------------------------

/** Everything the dashboard renders, gathered in one server pass. */
export function getDashboard(user: SessionUser) {
  const today = localDay(new Date(), user.timezone);
  const totals = getTotals(user.id, today);
  return {
    today,
    totals,
    streak: getStreak(user.id, today),
    level: getLevelProgress(totals.lifetime),
    logs: getLogsForDay(user.id, today),
    groups: getUserGroups(user.id, today),
  };
}

export function getProfile(user: SessionUser) {
  const today = localDay(new Date(), user.timezone);
  const totals = getTotals(user.id, today);
  const streak = getStreak(user.id, today);
  const level = getLevelProgress(totals.lifetime);
  const earned = evaluateAchievements({
    lifetimeXp: totals.lifetime,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    totalEntries: totals.entries,
    distinctActivities: totals.distinct_activities,
    level: level.level,
  });
  const earnedIds = new Set(earned.map((achievement) => achievement.id));

  return {
    today, totals, streak, level,
    series: getDailySeries(user.id, today, 14),
    categories: getCategoryBreakdown(user.id),
    topActivities: getTopActivities(user.id),
    groups: getUserGroups(user.id, today),
    achievements: ACHIEVEMENTS.map(({ earned: _earned, ...rest }) => ({
      ...rest, unlocked: earnedIds.has(rest.id),
    })),
  };
}
