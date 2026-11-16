# Numbers

A number game for one player, or for one player against the CPU. A draw gives
a number from 1 to 1000. Put each number in one of 20 slots, so that the slots
go up from the top to the bottom. When no empty slot can take the number, the
game ends. Put a number in each slot to win.

```bash
pnpm --filter numbers dev
```

The app runs on port 3004. It is public: it has no sign-in, and it has no
server data. The game runs in the browser.

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

A Reset starts the run of a new seed in place, and adds its address to the
history. Back and Forward start the run of the seed of the address again,
from its start. Share seed in the menu of the bar copies the address of the run.

`src/hooks/use-game.ts` holds the state of one game and its actions: Draw,
place, and Reset.

## The page

The header shows the name of the app and the settings. A segment in the
settings switches two tabs: "UI" has the appearance pickers of `ui`, and
"Game" has the settings of the game (see below). A bar under the header
holds the drawn number, the action, and a menu with Reset and Share seed.
Reset in the menu starts a new seed at each step. The number rolls to each new
number through the `Odometer` of `ui`.

The 20 slots are buttons. Only a slot that can take the drawn number is on,
with an amber outline. A filled slot shows its number in a soft green, and it
stays off. When the drawn number has no slot, a dashed line and the number
show between the two numbers that it goes between, and the action becomes a
red Reset. After a win, the action is Reset.

A bar at the bottom shows the score: the count of the filled slots, of 20,
while Show score is on.
Only the slots scroll, in a box between the two bars, so the bars never cover
a slot that has the focus. The page box is the height of the visible area
(`h-dvh`), so the bottom bar is above the toolbar of Safari and of Chrome. A
screen reader hears the score at a bust.

An action can turn off the button that the reader pressed. The focus then
moves to the first slot that can take the number, or else to the action.

## Settings

The Game tab of the settings has two switches:

| Setting | Default | What it does |
| --- | --- | --- |
| Auto-draw | Off | The game draws each number itself: at the load of the page, after each placement, and after a Reset. The bar has no Draw button, and the action shows only as Reset after a bust or a win. |
| Show score | On | The bar at the bottom shows the score. |
| Vs CPU | Off | The CPU plays the same deck beside the player (see below). |

Each setting is in a cookie (`numbers-auto-draw`, `numbers-show-score`, and
`numbers-vs-cpu`, `src/utilities/settings.ts`). The page reads the cookies of
the request, so the server renders the Draw button, the score bar, and the
column of the CPU as the settings of the reader give them, and the first paint
is the final layout (CONVENTIONS §3.13). With Auto-draw on, the first number rolls in after the hydration. A
write also puts a copy in `localStorage`, and the `storage` event of the copy
gives the change to the other tabs.

## Vs CPU

With Vs CPU on, a second column beside the slots holds the game of the CPU.
The CPU plays the deck of the same seed, so it gets the same numbers in the
same order. It places each number after the player places it, so the player
always chooses first. When the game of the player ends, the CPU plays the rest
of its deck. The higher count of filled slots wins, and the same count is a
tie.

The CPU puts each number in the run of empty slots that can take it, in
proportion to the place of the number in the open range of the run
(`chooseSlot` in `src/utilities/game.ts`). With no number placed, 500 goes near
the middle of the column, and 990 goes near the end. Over 20,000 seeds, the CPU
fills 9.8 slots on average. The game of the CPU comes from the seed and the
count of the draws only (`playCpu`), so the page keeps no state for it, and
the switch can come on in the middle of a run.

The bar at the bottom has a score under each column. It shows also with Show
score off, because it names the columns and gives the result. After the end,
the score of the winner is green and reads "You win" or "CPU wins", and a tie
makes both scores amber. A screen reader hears the result at the end.

## Deploy

Each push to `main` deploys the app to `numbers.ivoryimage.dev`, through the
`numbers` component of [`.do/app.yaml`](../../.do/app.yaml). The app is
public: it has no sign-in, and it reads no data of a reader.
