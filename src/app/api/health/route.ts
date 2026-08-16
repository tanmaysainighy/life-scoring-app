import { get } from "@/lib/db";

/**
 * Liveness check for the host's health probe. Unauthenticated on purpose, and
 * it touches the database so a container with a broken volume mount reports
 * unhealthy instead of quietly serving errors.
 */
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const activities = get<{ n: number }>(`SELECT COUNT(*) AS n FROM activities`)?.n ?? 0;
    if (activities === 0) {
      return Response.json({ status: "degraded", reason: "taxonomy not seeded" }, { status: 503 });
    }
    return Response.json({ status: "ok", activities });
  } catch {
    return Response.json({ status: "error", reason: "database unavailable" }, { status: 503 });
  }
}
