# Grid Range Selection, Fill & Paste — Feature Plan — 2026-07-13

Increment 7 of the [grid editing plan](2026-07-08-GRID-EDITING-PLAN.md), pulled into its own design as that plan directs. What the anchored range is, how fill and paste ride the one commit sink, and what stays deferred.

## Thesis

The cursor grows an **anchored rectangular range** — Shift+arrows stretch it from where the cursor stood, exactly as a spreadsheet's selection stretches — and every bulk gesture over it (copy, fill, paste) is sugar over the same two primitives the module already has: the cursor's coords and the `CellChange[]` commit sink. Nothing gains a second write path; a pasted block and a fill are just batches that span rows, flowing through per-column `validate` and the async/undo layers the sink already carries.

## Model

- **Anchor + extent.** The range is the rectangle between an `anchor` coord and the cursor's active cell. Shift+movement (arrows, Home/End, PageUp/Down) seats the anchor at the cursor's pre-move cell when none is seated, then lets the cursor move; any unshifted move — or Escape — collapses the range. No anchor means no range: the active cell alone.

- **Rendering.** Range membership rides the cursor-store pattern: the cell marker (`GridNavCell`) subscribes and toggles `data-range` (a soft accent wash, `kata/grid` §nav) plus `aria-selected` on its `role="gridcell"` `<td>` — imperative attributes, so the memoized rows hold and a range sweep re-renders nothing.

- **Availability.** The range and copy exist wherever the cursor does (`navigable` or `editable` — reading is not a write). Fill and paste additionally require `editable`: they need the sink.

## Gestures

- **Copy (Ctrl/Cmd+C).** Serializes the range (or the active cell) as TSV — each cell its column `field`'s value, stringified — onto the clipboard through the native `copy` event's `clipboardData`, which needs no clipboard permission. Announced politely.

- **Paste (Ctrl/Cmd+V).** Parses the clipboard's TSV block through the native `paste` event and maps it cell-by-cell from the range's top-left (or the active cell): each value coerces to the target cell's current primitive type (`coercePastedValue`), skips read-only / field-less columns and cells past the grid's extent, drops `validate` failures and unchanged values, and commits the rest as **one** `CellChange[]` batch through the sink — so a paste is pending-shrouded under an async sink and undoable like any other commit.

- **Fill (Ctrl/Cmd+D, Ctrl/Cmd+R).** Fills the range from its leading edge — D copies the top row of the range down it, R the left column across it — through the same coerce-free batch path (the source values are already typed). Requires a real range (a collapsed range fills nothing).

## Non-goals (this increment)

- **Pointer fill handle.** The draggable corner square is real UI machinery (pointer capture, live rect preview, autoscroll) on top of the same batch semantics; it lands as its own slice once the keyboard model has soaked. Nothing here blocks it — a drag ends in the exact `fill` call Ctrl+D makes.

- **Series fill.** D/R copy values; extending a numeric/date series is a projection layer over the same batch and waits for the handle.

- **Mouse range drag.** Shift+click extension and drag-select are pointer sugar over the anchor model, deferred with the handle.

## Accessibility

The table stays the single tab stop; the range is announced through its cells' `aria-selected` and never moves focus. Copy, paste, and fill announce politely through the existing commit announcements (WCAG 4.1.3); paste and fill land as one batch, so one announcement. Ctrl/Cmd+C/V/D/R fire only from the tab stop — a key inside an editor belongs to the editor.

## Tests

`grid-range.test.tsx`: anchor seat/collapse over Shift+moves; `data-range`/`aria-selected` sweep; copy TSV shape; paste mapping (coercion, validate drop, read-only skip, extent clip, one batch); fill down/right; keys standing down off the tab stop and under a non-editable grid (paste/fill).

---

**See also:** [`2026-07-08-GRID-EDITING-PLAN.md`](2026-07-08-GRID-EDITING-PLAN.md) · [`use-grid-navigation.ts`](../src/modules/grid/use-grid-navigation.ts) · [`engine/grid-editing-utilities.ts`](../src/modules/grid/engine/grid-editing-utilities.ts).
