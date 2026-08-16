import { route, ok } from "@/lib/api";
import { getDashboard } from "@/lib/queries";

/**
 * The web app renders the dashboard on the server and never calls this — it
 * exists for other clients. No LLM is involved in reading a dashboard.
 */
export const GET = route(async ({ user }) => ok(await getDashboard(user)));
