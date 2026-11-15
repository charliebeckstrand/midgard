# Numbers

A number game for one player. A draw gives a number from 1 to 1000. Put each
number in one of 20 slots, so that the slots go up from the top to the bottom.
When no empty slot can take the number, the game ends. Put a number in each
slot to win.

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
| `/` | Sends the reader to the address of a new seed |
| `/k3x9q2` | The run of the seed |

A Reset starts the run of a new seed in place, and adds its address to the
history. Back and Forward start the run of the seed of the address again,
from its start. Share seed in the menu of the bar copies the address of the run.

`src/hooks/use-game.ts` holds the state of one game and its actions: Draw,
place, and Reset.

## The page

The header shows the name of the app and the settings.
The settings have the appearance pickers of `ui` and the Auto-draw switch. A
bar under the header holds the drawn number, the action, and a menu with
Reset and Share seed. Reset in the menu starts a new seed at each step. The bar stays at
the top while the slots scroll under it. The number rolls to each new number
through the `Odometer` of `ui`.

The 20 slots are buttons. Only a slot that can take the drawn number is on,
with an amber outline. A filled slot shows its number in a soft green, and it
stays off. When the drawn number has no slot, a dashed line and the number
show between the two numbers that it goes between, and the action becomes a
red Reset. After a win, the action is Reset.

An action can turn off the button that the reader pressed. The focus then
moves to the first slot that can take the number, or else to the action.

## Auto-draw

While Auto-draw is on, the game draws each number itself: at the load of the
page, after each placement, and after a Reset. The setting is in
`localStorage`, so it stays for the next visit on the same device. The server
cannot read it, so the first paint shows the game before a draw, and the first
number rolls in after the hydration. The setting changes no layout.

## Deploy

The app has no App Platform component yet, so a push to `main` does not
deploy it.
