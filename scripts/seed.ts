import { seedTaxonomy } from "../src/lib/seed.ts";
import { get } from "../src/lib/db.ts";

/**
 * Re-applies the canonical taxonomy from taxonomy.ts.
 *
 * Safe to run any time: activities are keyed by slug, so this refreshes names,
 * keywords and rates without creating duplicates. It does not touch user data,
 * and existing logs keep the rate they were scored at.
 *
 *   npm run seed
 */
seedTaxonomy();

const activities = get<{ n: number }>(`SELECT COUNT(*) AS n FROM activities`)?.n ?? 0;
const aliases = get<{ n: number }>(`SELECT COUNT(*) AS n FROM activity_aliases`)?.n ?? 0;
console.log(`Seeded ${activities} canonical activities and ${aliases} aliases.`);
