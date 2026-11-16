# Numbers

A number game for one player, or for one player against the CPU. A draw gives
a number from 1 to 1000. Put each number in one of 20 slots, so that the slots
go up from the top to the bottom. When no empty slot can take the number, the
game ends. Put a number in each slot to win.

```bash
pnpm --filter numbers dev
```

The app runs on port 3004. The game runs in the browser, and it needs no
session. Sign-in is optional (see [Sign-in](#sign-in)).

```bash
pnpm --filter numbers test
```

## The rules

`src/utilities/game.ts` holds the rules as pure functions. Each run has a deck
of 20 different numbers, which its seed gives, and each draw gives the next
number of the deck. A slot can take a number when it is empty, each number
above it is smaller, and each number below it is larger.

## The seed

Each run has a seed, which is the last segment of its address, such as
`/k3x9q2`. The same seed gives the same numbers in the same order, so a reader
can send a run to another reader. A seed has 1 to 32 lower-case letters and
digits, so a reader can also type a word, such as `/charlie`. Another address
has no page.

`src/utilities/seed.ts` makes the seeds and the random source of a seed. The
seed goes through FNV-1a to a 32-bit state, Mulberry32 steps the state, and a
partial Fisher-Yates shuffle takes the deck.

| Route | Page |
| --- | --- |
| `/` | `proxy.ts` sends the reader to the address of a new seed (`307`) |
| `/k3x9q2` | The run of the seed |
| `/20261115` | The daily puzzle of a date: the seed is the date as `YYYYMMDD` |
| `/vs` | `proxy.ts` sends the reader to the address of a new seed against the CPU (`307`) |
| `/vs/k3x9q2` | The run of the seed against the CPU (see [Vs CPU](#vs-cpu)) |

A Reset starts the run of a new seed in place, in the same mode, and adds its
address to the history. A link, Back, and Forward start the run of the seed of
the address again, from its start.

The daily puzzle of a day is the run of the seed of its date (`dailySeed`), in
the time zone of the reader, so each reader gets the same numbers on the same
date. The server cannot know the date of the reader, so the link to the daily
puzzle renders only in the open menu.

Share seed in the share menu of the bottom bar copies the address of the run.
Share screenshot in the same menu draws the page, as the screen shows it, to a
PNG (`rasterizeElement` of `ui/core`, `src/utilities/screenshot.ts`). It gives the
image to the share sheet of the device, or saves it where the browser cannot
share a file.

`src/hooks/use-game.ts` holds the state of one game and its actions: Draw,
place, and Reset.

## The page

The header shows the name of the app, the settings, and a menu with Home (a
new seed), Daily puzzle, and Vs CPU (a new seed against the CPU). Under a
divider, the menu has Sign in, or Stats, Leaderboard and Sign out for a
signed-in reader. A segment in the settings switches two tabs: "UI" has the
appearance pickers of `ui`, and "Game" has the settings of the game (see
below). A bar under the header holds the drawn number, the action, and a menu
with Reset. Reset in the menu starts a new seed at each step. The number rolls
to each new number through the `Odometer` of `ui`, and the first number of each
run rolls from 0.

The 20 slots are buttons. Only a slot that can take the drawn number is on,
with an amber outline. A filled slot shows its number in a soft green, and it
stays off. When the drawn number has no slot, a dashed line and the number
show between the two numbers that it goes between, and the action becomes a
red Reset. After a win, the action is Reset.

A bar at the bottom shows the score: the count of the filled slots, of 20,
while Show score is on. A share button at the right of the bar, apart from the
score, opens a menu with Share seed and Share screenshot. With Show score off,
the bar holds only the share button. Only the slots scroll, in a box between the two bars, so the bars never cover
a slot that has the focus. The page box is the height of the visible area
(`h-dvh`), so the bottom bar is above the toolbar of Safari and of Chrome. A
screen reader hears the score at a bust.

An action can turn off the button that the reader pressed. The focus then
moves to the first slot that can take the number, or else to the action.

## Settings

The Game tab of the settings has two switches:

| Setting | Default | What it does |
| --- | --- | --- |
| Auto-draw | On | The game draws each number itself: at the load of the page, after each placement, and after a Reset. The bar has no Draw button, and the action shows only as Reset after a bust or a win. |
| Show score | On | The bar at the bottom shows the score. |

Each setting is in a cookie (`numbers-auto-draw` and `numbers-show-score`,
`src/utilities/settings.ts`). The page reads the cookies of the request, so
the server renders the Draw button and the score bar as the settings of the
reader give them, and the first paint is the final layout (CONVENTIONS
§3.13). With Auto-draw on, the first number rolls in after the hydration. A
write also puts a copy in `localStorage`, and the `storage` event of the copy
gives the change to the other tabs.

## Vs CPU

Vs CPU in the menu of the header opens `/vs`, which starts the run of a new
seed against the CPU at `/vs/<seed>`. A second column beside the slots holds
the game of the CPU. The server renders the two columns, so the first paint is
the final layout. The CPU plays the deck of the same seed, so it gets the same numbers in the
same order. It places each number after the player places it, so the player
always chooses first. When the game of the player ends, the CPU plays the rest
of its deck. The higher count of filled slots wins, and the same count is a
tie.

The CPU puts each number in the run of empty slots that can take it, in
proportion to the place of the number in the open range of the run
(`chooseSlot` in `src/utilities/game.ts`). With no number placed, 500 goes near
the middle of the column, and 990 goes near the end. Over 20,000 seeds, the CPU
fills 9.8 slots on average. The game of the CPU comes from the seed and the
count of the draws only (`playCpu`), so the page keeps no state for it.

The bar at the bottom has a score under each column. It shows also with Show
score off, because it names the columns and gives the result. After the end,
the score of the winner is green and reads "You win" or "CPU wins", and a tie
makes both scores amber. A screen reader hears the result at the end.

## Sign-in

Sign-in is optional, and no page needs a session. The app takes the same parts
as Places: `withAuth` with `gatewayApi` sends `/auth/*` and `/api/*` to the
gateway, and the shared pages of `shared/auth` are the sign-in, register, and
password pages (`app/(guest)`) and `/verify-email`. The proxy gates no route.
It sends `/` and `/vs` to a new seed, and it gives the address of the browser
to an auth or API request (`forwardClientIp`).

The page of a run reads the session, so the first paint shows the menu items of
the reader. A failure of the gateway shows the reader as signed out, and the
run still plays. After a sign-in, the shared page goes to `/`, which starts a
new seed. The contract with the gateway is in [asgard
`.claude/docs/midgard.md`](https://github.com/charliebeckstrand/asgard/blob/main/.claude/docs/midgard.md).

## Stats

Stats in the header menu, above Sign out, opens a dialog with the stats of a signed-in reader,
one tab for each mode (Solo and Vs CPU): the runs played, the best and the
average score, the daily streak and the longest one, and a bar chart of the
runs on each score from 1 to 20. The first number always has an empty slot, so
no run scores 0. Mimir, in asgard, keeps them
(`/api/games/numbers/*`, `src/api/stats-api.ts`).

A run counts when it ends in a bust or a win, and when a Reset ends it after
its first placement, with its score at that step (`isUnfinished`). A link,
Back, or Forward leaves the run, and the run does not count. `useGame` gives an
ended run to its `onEnd` in the action, not in an effect, so a held route that
shows again does not count its run a second time. A run counts only for a user
with a verified email. The first run of a daily puzzle counts toward the
streak. A reader with no session gets no Stats item in the menu.

After the first run of the daily puzzle of today counts, the Daily puzzle item
of the menu shows a green check (`dailyScore` of the stats). A new run of the
puzzle shows a toast: the reader played the puzzle, its score is kept, and a
replay does not change the streak (`useDailyNotice`). The toast waits for
the stats, and a run that ends before they arrive gets no toast, because its
own result can be in them. A reader with no session, or with no verified
email, has no stats, so the item stays a plain link and no toast shows.

## Leaderboard

Leaderboard in the header menu opens a dialog with the board of each daily
puzzle, for a signed-in reader. A tab for each mode (Solo and Vs CPU) holds the
board of one date: the top 10 players by the score of their first run of the
puzzle, then the reader when they are below them, and the count of players.
Equal scores share a rank. The board opens on today, the date of the reader,
and the arrows go to earlier days, but not past today. Mimir keeps the boards
(`/api/games/numbers/daily`, `src/api/leaderboard-api.ts`).

Each player shows by the name of their account, or as "Anonymous" when the
account has no name, as an account from GitHub or Google does. Mimir keeps the
name that each run sends. A reader with no name sees a line that tells them how
they show. A reader with no verified email sees the boards, and a line that
asks for the verification, because only the runs of a verified user count. A
daily run that counts makes its board read again.

## Deploy

Each push to `main` deploys the app to `numbers.ivoryimage.dev`, through the
`numbers` component of [`.do/app.yaml`](../../.do/app.yaml). The component has
`BIFROST_URL` and `CLIENT_IP_SECRET`, as Places has.
