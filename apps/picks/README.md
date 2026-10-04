# Picks

Pick the winner of each NFL game, week by week.

```bash
pnpm --filter picks dev
```

The app runs on port 3002.

```bash
pnpm --filter picks test
```

`withAuth` sends each `/auth/*` and `/api/*` path that the app does not serve
to the gateway at `BIFROST_URL` (see [`.env.example`](.env.example)). The
sign-in pages come from `shared`, as in the places app.

## The schedule and the scores

The public scoreboard of ESPN gives the weeks, the games, the scores, and the
logos. It needs no key. `src/server/scoreboard.ts` reads it on the server, and
`src/server/espn-scoreboard.ts` reads each field of the answer. The feed has no
contract, so a record that does not match the expected shape is skipped.

The cache holds the calendar for days. A week in play refreshes each minute, a
week that is over holds for days, and a week to come holds for hours. The
prediction form reads the games of its week through
`app/api/scoreboard/[season]/[week]`.

## The picks

A prediction is a pick of the winner of each game of one week. The schedule
shows an Add button for a week with no prediction, and an Edit and a Delete
button for a week with one. `?predict=w5` opens the form on week 5, so the form
is a link. In a week, the outline of a final game is green where the pick was
right and red where it was wrong. A tie has no winner, so a pick on a tie is
wrong.

A game locks at its kickoff. The form disables the pick of a locked game, and
the Delete button of a week is disabled from its first kickoff.

Mimir, in asgard, keeps the picks of each user. The gateway forwards
`/api/predictions/*` to it. Mimir does not read the schedule, so the writes go
through `app/api/predictions/[season]/[week]` first. That route keeps the stored
pick of each locked game and refuses a delete after the first kickoff. After a
change to the Mimir API, run `pnpm --filter picks openapi`. The contract is in asgard's
[`.claude/docs/midgard.md`](https://github.com/charliebeckstrand/asgard/blob/main/.claude/docs/midgard.md).
