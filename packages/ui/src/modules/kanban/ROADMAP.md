# Kanban roadmap

> **Goal: a board that moves cards in a column and across columns, by pointer and by keyboard, with one model for both.** The engine decides each move and each sentence that a screen reader speaks. The shell connects the engine to dnd-kit, to the keys, and to the DOM.

## Status

The board takes its data and its structure apart, and the keys join them. `columns` holds the order that the board changes, and the children hold what each column and each card render. A `KanbanColumn` key or a `KanbanCard` key that names no data renders, does nothing, and warns in development.

The board composes the parts of the library. A column is a `Card` with the `tint` fill and a named `role="group"`, so the board stays the one region. A card is a `Card` with the `surface` fill inside an `<li>`. The column title renders through `Heading` on the title scale, as a `CardTitle` does. The handle is a `SortableGrip` with an `Icon`. The drag overlay is a `PortalDragOverlay`, and the keyboard lift is `useKeyboardLifted`.

`KanbanCardSurface` is the box of a card. It holds a handle child at the start edge, and puts the other children in one column beside it. The card and the drag overlay both render it, so the overlay has the box of the card.

A pointer drag starts only from the handle. On drag-over, a card moves into the column under the pointer. On the drop, it takes the slot of the card under the pointer. A cancel after a move across columns reports the columns from the drag start. After a move across columns, the board ignores the column that the card left until the next frame, so a drag at the edge of two columns does not flip the card.

The keyboard follows the APG pattern for a grabbed element. Space lifts and drops a card. A lifted card steps in its column on Up and Down, and across the board on Left and Right. A card that is not lifted moves the focus. Left and Right swap in a right-to-left layout.

A pointer drag renders only the columns that it touches. The board splits its context in two: the cards read a value that holds still through a drag, and the columns read the drag state. Each card reads its own lift from a keyed store.

## Engine: the substrate

The domain lives in [`engine/`](engine), a pure functional core:

- `kanban-board` indexes the columns, so each lookup of a card or a column is a map read.
- `kanban-slot` gives the slot of a card: its column, its position, and the count of its column.
- `kanban-move` gives each move as the next columns and the slot of the card. The drag-over move, the drop, and the two keyboard steps share one `moveCard`.
- `kanban-navigation` gives the card that a key moves the focus to, and the step that a key gives a lifted card.
- `kanban-announcements` gives each sentence of the live region. The pointer drag and the keyboard use the same sentences.

Each file is framework-free, and each has its own test suite. The engine reads card names and column names through `KanbanNames`, which the shell fills from the DOM in `kanban-names.ts`. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for this engine.

## Backlog

The backlog is empty.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
