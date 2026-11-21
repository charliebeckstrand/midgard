# Kanban roadmap

> **Goal: a board that an app can persist, constrain, and operate with one pointer.** The board moves cards by pointer and by keyboard through one model. It does not yet tell an app when a move ends, refuse a move, or give a pointer path with no drag (WCAG 2.5.7).

## Status

The board takes its data and its structure apart, and the keys join them. `columns` holds the order that the board changes, and the children hold what each column and each card render. A `KanbanColumn` key or a `KanbanCard` key that names no data renders, does nothing, and warns in development. The "Kanban key joins" block of [`kanban.test.tsx`](../../__tests__/modules/kanban.test.tsx) holds the warnings.

The board composes the parts of the library. A column is a `Card` with the `tint` fill and a named `role="group"`, so the board stays the one region. A card is a `Card` with the `surface` fill inside an `<li>`. The column title is a `CardTitle`. The handle is a `SortableGrip` with an `Icon`. The drag overlay is a `PortalDragOverlay`, and the keyboard lift is `useKeyboardLifted`.

`KanbanCardSurface` is the box of a card. It holds a handle child at the start edge, and puts the other children in one column beside it. The card and the drag overlay both render it, so the overlay has the box of the card. [`kanban-drag-overlay.test.tsx`](../../__tests__/browser/kanban-drag-overlay.test.tsx) holds the overlay content after a move across columns.

A pointer drag starts only from the handle, and the rest of the card selects text and scrolls. [`kanban-card-handle.test.tsx`](../../__tests__/browser/kanban-card-handle.test.tsx) and [`kanban-card-touch.test.tsx`](../../__tests__/browser/kanban-card-touch.test.tsx) hold this in a real browser.

On drag-over, a card moves into the column under the pointer, and `onReorder` fires with the next columns. On the drop, the card takes the slot of the card under the pointer. A cancel after a move across columns reports the columns from the drag start. After a move across columns, the board ignores the column that the card left until the next frame. Thus a drag at the edge of two columns does not flip the card. [`use-kanban-drag.test.ts`](../../__tests__/modules/use-kanban-drag.test.ts) holds each of these rules.

A board that turns disabled or read-only during a pointer drag makes the drop a cancel. [`kanban-drop-target.test.tsx`](../../__tests__/browser/kanban-drop-target.test.tsx) holds this, and the highlight of the drop column.

The keyboard follows the APG pattern for a grabbed element. Space lifts and drops a card. A lifted card steps in its column on Up and Down, and across the board on Left and Right. A card that is not lifted moves the focus. Each step commits through `onReorder`, so Escape and Enter only drop the lift. Left and Right swap in a right-to-left layout through `logicalArrowKey`, which [`logical-arrow-boundary.test.ts`](../../__tests__/boundary/logical-arrow-boundary.test.ts) holds.

A move renders only the columns that it touches. The board splits its context in two: the cards read a value that holds still through a drag, and the columns read the drag state. Each card reads its own lift from a keyed store. [`keyboard-lift-render.test.tsx`](../../__tests__/boundary/keyboard-lift-render.test.tsx) counts the renders of a lift and of a move.

## Engine

The domain lives in [`engine/`](engine), a pure functional core:

- `kanban-board` indexes the columns, so each lookup of a card or a column is a map read.
- `kanban-slot` gives the slot of a card: its column, its position, and the count of its column.
- `kanban-move` gives each move as the next columns and the slot of the card. The drag-over move, the drop, and the two keyboard steps share one `moveCard`.
- `kanban-navigation` gives the card that a key moves the focus to, and the step that a key gives a lifted card.
- `kanban-announcements` gives each sentence of the live region. The pointer drag and the keyboard use the same sentences.

Each file is framework-free, and each has its own test suite under [`__tests__/modules`](../../__tests__/modules). The engine reads card names and column names through `KanbanNames`, which the shell fills from the DOM in `kanban-names.ts`. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant. No file in `engine/` is a client boundary, and none has a runtime import of React, Motion, dnd-kit, or the shell. A type-only import, such as the `Announcements` type of dnd-kit, is correct. The engine has no barrel, so each consumer imports the file that it needs.

## Features

1. **A move-end event (*P2*).** Add `onReorderEnd`, which fires once when a move ends, with `{ cardId, from, to, canceled, columns }`. `from` and `to` are `KanbanSlot` values. Why: `onReorder` fires on each drag-over and on a cancel. An app that saves each call sends a request for each column that the pointer crosses. Grid gives `onReorderEnd` (`modules/grid/grid-data-types.ts`), Dashboard gives `onDragEnd` (`modules/dashboard/types.ts`), and react-beautiful-dnd gives `onDragEnd` with the source and the destination. Where: `endDrag` in `use-kanban-drag.ts`, and the drop and the blur of the lift in `use-kanban-keyboard.ts`, with one end for each lift. Proof: cases in `use-kanban-drag.test.ts` and `use-kanban-keyboard.test.ts`, and a "Last move" readout in the docs playground (CONVENTIONS.md §13.6).

2. **A move rule (*P2*).** Add `canMove?: (move: { cardId, from, to }) => boolean`, which the engine reads before it gives a move. A refused move gives `null`, so no `onReorder` fires. Why: a Jira board limits which columns a card can enter, and a work-in-progress limit refuses a full column. The `canDrop` of Atlassian Pragmatic drag and drop is the peer. Where: the moves of `engine/kanban-move.ts` read the rule from the board index, and a refused keyboard step announces a new message of `primitives/intl/intl-reorder.ts`. Open question: a step across a refused column stops there or goes on to the next column that takes the card. Proof: cases in `kanban-move.test.ts`, and a docs example with a limit on one column.

3. **Column reorder (*P2*).** Let the reader move a column, by pointer from a `KanbanColumnHandle` in the header, and by keyboard with the same lift model. The result goes through `onReorder` as `columns` in a new order, so no new callback is necessary. Why: Trello, Jira, and GitHub Projects let a reader move a list, and the board example of Pragmatic drag and drop does too. Where: a `moveColumn` and a column step in `engine/kanban-move.ts`, a horizontal `SortableContext` over the columns in `kanban.tsx`, and a column subject in `engine/kanban-announcements.ts`. The new export needs assent before the work starts ([CLAUDE.md](../../../../../CLAUDE.md) §3.1). Proof: engine cases, a keyboard case in `kanban.test.tsx`, a pointer case in the browser suite, and a docs example.

4. **Collapsed columns (*P3*).** Let a column collapse to a narrow strip that shows its title and its count. Why: Jira and GitHub Projects collapse a column that holds finished work, so the board holds more columns on screen. Open questions: a collapsed column stays a drop target or not, and the title turns on its side or not. Where: a `collapsed` prop on `KanbanColumn`, with `open`, `defaultOpen`, and `onOpenChange` if the column holds the state (CONVENTIONS.md §4.9), and a `collapsed` axis in `recipes/kata/kanban.ts`. Proof: a browser test of the strip width and of the drop rule, and the disclosure sweep if the column takes `open`.

5. **A virtualized column body (*P3*).** Add `virtualize` to `KanbanColumnBody`, so a column renders only the cards in view. Why: the `large` rung of [`kanban.bench.tsx`](../../__benchmarks__/kanban.bench.tsx) mounts a dnd-kit sortable for each card, and a board that holds a backlog only scrolls. Grid gives the same prop. Open questions: dnd-kit sorts only mounted items, and the keyboard focus can move to a card that is not mounted. Proof: the `large` rung of the bench before and after, and a browser test that lifts a card past the window.

## Pattern cleanup

1. **The TSDoc of `KanbanCard` is on a private symbol (*P2*).** In `kanban-card.tsx`, the full TSDoc is on `KanbanCardImpl`, and the export `KanbanCard` says "See {@link KanbanCardImpl}". The docs API reference and the editor read the export, so they show a link to a symbol that no barrel exports (CONVENTIONS.md §12.1). Fix: move the TSDoc onto the export, as `Markdown` does in `components/markdown/markdown.tsx`. A check in `tsdoc-coverage-boundary.test.ts` that finds a barreled doc with a link to an `Impl` symbol can hold the fix.

2. **TSDoc and comments out of the house voice (*P2*).** `context.ts` uses the passive "Provided by `<Kanban>`; read by" in each context doc, and its `liftedStore` remarks tell the history of an earlier design. `use-kanban-keyboard.ts` writes "lifts/drops" and "arrows/Home/End", and `kanban.tsx` writes "drag/keyboard state". The comment "Surfaces the column context for use within this card" in `kanban-card.tsx` does not say why the card reads `itemIds`. Fix: rewrite these in STE (rules 4 and 9), and drop the history, which the pull request holds. Review holds rule 4, because the controlled-language gate reads only rules 3, 6, and 10 ([STE.md](../../../../../STE.md)).

3. **Names that do not say what they hold (*P2*).** In `kanban.tsx`, `labelProps` holds each prop of the `<section>`, not only its name (CONVENTIONS.md §8.4). A case in `kanban.test.tsx` names `onValueChange`, a prop that the board does not have; the board takes `onReorder`. Fix: rename the binding to `props`, and name `onReorder` in the case. No gate is practical for either.

## Performance

1. **A bench for a move (*P2*).** [`kanban.bench.tsx`](../../__benchmarks__/kanban.bench.tsx) measures only the first mount. No bench measures a move, which is the cost that the split context, `reuseColumnIds`, and the memo of `KanbanCard` exist to cut. Avenue: add a move bench on the same three rungs. It lifts a card with Space and steps it across a column, through the keyboard seam (CONVENTIONS.md §10.3). Record the first numbers with their date in the bench README. The existing roadmap records no numbers to keep.

## Accessibility and testing

1. **A move with one pointer and no drag (*P1*).** WCAG 2.5.7 (AA) requires a single-pointer path for each operation that a drag does. The keyboard lift is not a pointer path, so a pointer user who cannot drag cannot move a card. Fix: a "Move to" menu on the card, with an item for each other column and for up and down. The Grid group manager has such a menu (`modules/grid/grid-group-manager.tsx`), and a Trello card has one too. Where: a `moveToColumn` in `engine/kanban-move.ts` over `moveCard`, and a new card part that renders a `Menu` and needs assent ([CLAUDE.md](../../../../../CLAUDE.md) §3.1). Proof: a case in `kanban.test.tsx` that selects an item and reads `onReorder` and the announcement, the card in the `data-complex` corpus, and the docs playground.

2. **No test of the right-to-left keys (*P2*).** Left and Right swap in a right-to-left layout, but `logical-arrow-boundary.test.ts` holds only the call of `logicalArrowKey`. No case reads the result. Fix: a case in `kanban.test.tsx` that renders the board under `dir="rtl"`, lifts a card, presses ArrowLeft, and reads the next column. Add a case for the focus move too.

3. **Escape keeps the keyboard moves (*P3*).** A lifted card commits each step, so Escape only drops it. A pointer cancel puts the card back, and the Dashboard keyboard sensor cancels on Escape too. A reader who lifts by mistake has no undo. Fix: let Escape report the columns from the lift start, as `handleDragCancel` does. Open question: `useKeyboardLifted` serves `List` too, so the change crosses units and needs assent ([CLAUDE.md](../../../../../CLAUDE.md) §3.1). Proof: a case in `use-kanban-keyboard.test.ts`, and a new sentence from `returnedText` in the announcements.

## Not planned

- A drag from the whole card. The handle is the only drag surface, so a control inside the card keeps its role and the card scrolls under a finger.

- A board that loads no `@dnd-kit` while it is read-only (CONVENTIONS.md §9.4). Each column and each card calls a dnd-kit hook, so a lazy split needs a second card tree. A board exists to move cards, and [`list-dnd-boundary.test.ts`](../../__tests__/boundary/list-dnd-boundary.test.ts) records that the board loads the library.

- Swimlanes. A row axis doubles the model of the engine and of the keyboard. An app can render one board for each lane, with no move between lanes.

- A drag of more than one card. Trello and Jira move one card at a time, and the lift model holds one id.

- A built-in card composer, a count badge, or a card dialog. The consumer composes them in the header and the body of a column, as the docs playground does with `Badge`.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md) · [`dashboard/ROADMAP.md`](../dashboard/ROADMAP.md).
