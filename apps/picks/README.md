# Picks

Pick the winner of each NFL game, week by week.

```bash
pnpm --filter picks dev
```

The app runs on port 3002.

The app does not deploy yet. [`.do/app.yaml`](../../.do/app.yaml) has no
`picks` component, so a push to `main` does not build it. To deploy it, add a
`picks` service, the `picks.ivoryimage.dev` domain, and its ingress rule, as
for `places`.

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
shows an Add button for a week that takes picks and has no prediction, and an
Edit button for a week with one. The Delete button shows until the first
kickoff of the week. `?predict=w5` opens the form on week 5, so the form is a
link.

A right pick of a favorite or of a pick'em is worth 1 point. A right pick of an
underdog is worth 1 more point for each 3 points, or part of 3, that the
underdog gets, so a 7-point underdog is worth 4 points. The app saves the line
of each pick with the pick, so a later move of the line does not change the
points. A pick saved before the line posted scores on the closing line. A tie
scores no points, and a postponed or a canceled game is not graded.

A mark after the picked team on each card shows the result: a grey check before
the game is over and for a tie, a green check for a right pick, and a red X for
a wrong pick. The tooltip of the mark gives the points.

A game locks at its kickoff. The form disables the pick of a locked game.

Mimir, in asgard, keeps the picks of each user. The gateway forwards
`/api/predictions/*` to it. Mimir does not read the schedule, so the writes go
through `app/api/predictions/[season]/[week]` first. That route keeps the stored
pick of each locked game, sets the line of each new pick, and refuses a delete
after the first kickoff. The types of the Mimir API come from `shared/mimir`.
After a change to the Mimir API, run `pnpm --filter shared openapi`. The
contract is in asgard's
[`.claude/docs/midgard.md`](https://github.com/charliebeckstrand/asgard/blob/main/.claude/docs/midgard.md).
