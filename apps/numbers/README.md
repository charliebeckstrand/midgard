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

`src/utilities/game.ts` holds the rules as pure functions. A draw gives a
number that no slot holds, and each such number has the same chance. A slot
can take a number when it is empty, each number above it is smaller, and each
number below it is larger. The tests give the random source, so each case is
the same on each run.

`src/hooks/use-game.ts` holds the state of one game and its actions: Draw,
place, and Reset.

## The page

The header shows the name of the app and the settings. The settings have the
appearance pickers of `ui` and the Auto-draw field. A bar under the header
holds the drawn number and the action. The bar stays at the top while the
slots scroll under it. The number rolls to each new number through the
`Odometer` of `ui`.

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
