import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Single shared connection. node:sqlite is synchronous and in-process, so a
 * query is a function call rather than a network round trip — this is what
 * keeps the dashboard render fast.
 *
 * The SQL below is deliberately vanilla; moving to Postgres means swapping this
 * file and the `?` placeholders, not rewriting the queries.
 */

const globalForDb = globalThis as unknown as { __lifescoreDb?: DatabaseSync };

function open(): DatabaseSync {
  const file =
    process.env.DATABASE_PATH || path.join(process.cwd(), "data", "lifescore.db");
  mkdirSync(path.dirname(file), { recursive: true });

  const database = new DatabaseSync(file);
  database.exec("PRAGMA journal_mode = WAL");   // concurrent readers
  database.exec("PRAGMA synchronous = NORMAL"); // durable enough, much faster
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  database.exec(readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8"));
  return database;
}

export const db: DatabaseSync = (globalForDb.__lifescoreDb ??= open());

/**
 * Typed helpers over node:sqlite's prepare/all/get/run.
 *
 * Rows come back with a null prototype, which React Server Components refuse to
 * serialise across the server/client boundary. Copying into plain objects here
 * means every caller gets something safe to pass straight into a component.
 */
export function all<T>(sql: string, ...params: unknown[]): T[] {
  const rows = db.prepare(sql).all(...(params as never[]));
  return rows.map((row) => ({ ...row })) as T[];
}

export function get<T>(sql: string, ...params: unknown[]): T | undefined {
  const row = db.prepare(sql).get(...(params as never[]));
  return row === undefined ? undefined : ({ ...row } as T);
}

export function run(sql: string, ...params: unknown[]): void {
  db.prepare(sql).run(...(params as never[]));
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
