import { get } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

/**
 * Liveness check for the host's health probe. Unauthenticated on purpose.
 *
 * It applies the schema and taxonomy rather than merely observing them, so a
 * freshly deployed container becomes ready by being probed. Reporting
 * "degraded" and waiting for a page load would let a host restart-loop the
 * service before it ever seeded itself.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const activities = (await get<{ n: number }>(`SELECT COUNT(*) AS n FROM activities`))?.n ?? 0;
    if (activities === 0) {
      return Response.json({ status: "degraded", reason: "taxonomy not seeded" }, { status: 503 });
    }
    return Response.json({ status: "ok", activities });
  } catch (error) {
    console.error("[health]", error);
    return Response.json({ status: "error", reason: "database unavailable" }, { status: 503 });
  }
}
