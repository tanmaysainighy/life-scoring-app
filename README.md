# LifeScore

Write what you did in plain language. Get a fair, deterministic score.

```
"I worked on my startup backend for 4 hours"
        ↓
🧱 Backend Development · 4h · 4 h × 15 XP/h = +60 XP
```

Two people describing the same activity in different words get the same XP. Always.

## The one rule that shapes everything

**The LLM interprets. It never scores.**

```
raw text → interpretation → canonical activity → scoring engine → XP
           (LLM, maybe)     (database)          (pure function)
```

The model's only job is choosing which canonical activity a sentence refers to,
from a shortlist it is given. It never sees an XP value, is never asked for one,
and its output is validated against that shortlist before anything downstream
touches it. Rates live in the database; [`scoring.ts`](src/lib/scoring.ts) turns
`(rate, duration)` into XP and does nothing else.

## Getting started

```bash
npm install && npm run dev
```

Open http://localhost:3000 and create an account. No database to install: with
`DATABASE_URL` unset the app runs Postgres in-process (PGlite) with its data
under `data/pgdata`. The activity taxonomy seeds itself, so the app is useful
immediately.

No configuration is required. To enable the LLM fallback, copy `.env.example` to
`.env.local` and set `GROQ_API_KEY` (get one at
[console.groq.com/keys](https://console.groq.com/keys)).

```bash
npm test        # 94 tests, no database server or network needed
npm run build   # production build
npm start       # production server
npm run seed    # re-apply the taxonomy after editing taxonomy.ts
```

## Deploying

State lives in Postgres, so the container is stateless — no volume, and it scales
past one instance. Any host that runs a Dockerfile works.

1. Create a free Postgres ([Neon](https://neon.tech) or
   [Supabase](https://supabase.com)) and copy its connection string.
2. Set `DATABASE_URL` on the host, and `GROQ_API_KEY` if you want the LLM
   fallback. Leave `NODE_ENV` and `PORT` alone — the platform sets those.
3. Deploy. The schema and taxonomy apply themselves on boot, and `/api/health`
   reports readiness.

Coming from the old SQLite build? Put `DATABASE_URL` in `.env` and run
`npm run import:sqlite` to copy accounts, groups, logs and memory across. It
remaps every activity reference through its slug rather than its id, and is safe
to run more than once.

The scripts read `.env` themselves (via Node's `--env-file-if-exists`), so there
is no shell-specific `VAR=value` prefix to get right.

To reset all data, delete the `data/` directory.

To put it on the web, see **[DEPLOY.md](DEPLOY.md)** — note that the SQLite file
means it needs a persistent volume and a single instance, so serverless hosts
like Vercel will not work.

## Without an API key

The app is fully functional without one. Activity resolution runs a cascade that
gets cheaper the more confident it is:

```
normalize → exact alias → stemmed alias → personal memory → alias-in-text → token similarity
                                                                                    ↓ unsure
                                                                              LLM classification
```

Everyday phrasings never reach the last step — `"coded for 3 hours"`,
`"went to the gym for an hour"` and `"I studied machine learning for 2 hours"`
all resolve locally in under a millisecond. That keeps the app fast, cheap and
consistent; the model is there for the long tail.

When nothing is confident enough the app asks rather than guesses — it never
invents an activity or a duration. The user can then pick the activity from the
full taxonomy themselves, and the server remembers that phrasing for them, so
the same words resolve on their own next time. Memory matches on stemmed tokens,
so teaching it "worked on TinyFish integration" also covers "spent 3 hours on
TinyFish". It changes *classification* only — the rate is still the shared one.

## Layout

```
src/lib/
  scoring.ts      the scoring engine — pure, no DB, no clock, no LLM
  levels.ts       level curve and progress
  streak.ts       streak rules
  validation.ts   anti-gaming limits (kept out of scoring so scoring stays pure)
  resolver.ts     the resolution cascade + deriving new canonical activities
  llm.ts          the only LLM call (Groq): strict schema, injection-hardened
  activities.ts   analyze → validate → score → store
  queries.ts      read models; every total is a SQL aggregate over an index
  taxonomy.ts     ~100 seeded canonical activities and their XP rates
  schema.sql      tables and indexes

src/app/          pages (server-rendered) and REST routes
src/components/   UI
tests/            scoring, durations, levels, streaks, resolution, integration
```

## Notable decisions

**Postgres, with no server to install locally.** One driver interface, two
backends: `pg` against a real server when `DATABASE_URL` is set, and PGlite —
Postgres compiled to WASM — in-process when it isn't. Local development and the
test suite need no database running, and tests are hermetic. Queries are written
with `?` placeholders and rewritten to `$1, $2, …` in `db.ts`.

**Server-rendered pages, not client fetches.** The dashboard runs its queries
during the render, so there's no request waterfall and no loading spinner for
data the server already had. The profile page ships 165 B of page JavaScript.

**Scores are versioned and snapshotted.** Each log row stores the rate and
`scoring_version` it was scored at. Re-pricing the taxonomy changes what new
entries earn and leaves history untouched — there's a test for exactly this.

**New activities are priced from their neighbours.** When something genuinely
new turns up, its rate is the *median* of related activities, clamped to the
range the taxonomy uses. If the neighbourhood is too thin to be confident, it's
filed for review instead of scored. Nobody, model or user, invents a number.

**Personal memory improves classification, never scoring.** Remembering that you
say "TinyFish" to mean AI work helps the resolver find the right canonical
activity. That activity's rate is the same shared rate everyone else gets.

## Security

- XP is created on the server only. A client that posts `{"xp": 99999}` is
  ignored — the rate comes from the taxonomy, keyed by activity id.
- User text is passed to the model as untrusted data inside `<user_activity>`
  tags, with a system prompt that forbids following instructions found in it.
  The prompt contains no scoring information to leak or manipulate.
- Model output is schema-validated, and any activity id it returns that wasn't
  in the shortlist we sent is rejected.
- Sessions are opaque server-side tokens; passwords are scrypt-hashed.
- Rate limits: 20/min on the AI endpoint, 60/min on writes, 10/5min on auth.
- Group data requires membership; non-members get a 404, not a 403, so a
  group's existence isn't leaked.

## Anti-gaming

| Case | Response |
| --- | --- |
| More than 24 h in one entry | rejected |
| Day total past 24 h | rejected, with the remaining time named |
| Unusually long session for its category | asks for confirmation |
| Same activity re-submitted within 10 min | warns, confirmable |

Impossible entries are refused; improbable ones are questioned. Neither accuses.
