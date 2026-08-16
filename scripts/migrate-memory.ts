import { all, run, transaction } from "../src/lib/db.ts";
import { tokenize } from "../src/lib/text.ts";

/**
 * One-off: rewrite user_activity_memory phrases into the stemmed-token form
 * the resolver now looks them up by.
 *
 * Memory is a soft cache — stale rows only mean a phrase isn't recognised until
 * it's used again — but rewriting them keeps existing users' memory working
 * across the change. Safe to run more than once.
 *
 *   npm run migrate:memory
 */
const rows = all<{ user_id: string; phrase: string; activity_id: string; hits: number; last_used: string }>(
  `SELECT user_id, phrase, activity_id, hits, last_used FROM user_activity_memory`,
);

let rewritten = 0;
let dropped = 0;

transaction(() => {
  for (const row of rows) {
    const phrase = tokenize(row.phrase).join(" ");
    if (phrase === row.phrase) continue;

    run(`DELETE FROM user_activity_memory WHERE user_id = ? AND phrase = ?`, row.user_id, row.phrase);
    if (!phrase) { dropped += 1; continue; }

    // Two old phrases can collapse into one token form; keep the busier one.
    run(
      `INSERT INTO user_activity_memory (user_id, phrase, activity_id, hits, last_used)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, phrase) DO UPDATE SET
         hits = user_activity_memory.hits + excluded.hits,
         last_used = MAX(user_activity_memory.last_used, excluded.last_used)`,
      row.user_id, phrase, row.activity_id, row.hits, row.last_used,
    );
    rewritten += 1;
  }
});

console.log(`Rewrote ${rewritten} memory phrases${dropped ? `, dropped ${dropped} that held no content` : ""}.`);
