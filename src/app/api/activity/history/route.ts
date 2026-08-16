import { route, ok } from "@/lib/api";
import { getRecentLogs } from "@/lib/queries";

/** Paginated history. LIMIT/OFFSET over the (user_id, created_at) index. */
export const GET = route(async ({ user, request }) => {
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const logs = getRecentLogs(user.id, limit, offset);
  return ok({ logs, next_offset: logs.length === limit ? offset + limit : null });
});
