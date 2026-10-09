# Grid Range Selection, Fill, and Paste — Design Plan — 2026-09-29

How the grid cursor grows a rectangular cell range, and how copy, paste, and fill act on that range. This is increment 7 of the Grid editing plan, which deferred it to its own plan. The decision here is the one model under all three features: the range is an extension of the cursor, and every write it makes goes through the one `onCommit` sink.

## Thesis

A range is the rectangle between an anchor cell and the cursor. The cursor is always one corner of it, so each existing cursor rule (the order, the clamp, the reseat, the scroll) holds for the range with no second position. Copy reads the rectangle. Paste and fill write it as one batch of `GridCellChange`, through the same unchanged check, `validate`, `onReject`, `onCommit`, async settle, history, and announcement as an editor save. No feature adds a second write path.

## Current state (verified in tree, 2026-09-29, main at 6f83165)

The cursor is one cell. Its state is a display coord `{ row, col }` in `use-grid-navigation.ts`, mirrored into `GridNavStore`. Each `GridNavCell` subscribes to its own `isActive(row, col)` flag through `useSyncExternalStore` and toggles `data-active` on its `<td>` in a layout effect. The `k.nav.cell` recipe (`recipes/kata/grid.ts`) draws the ring from that attribute. `row` indexes the published cursor order (`grid-cursor-order.ts`) when a grouped or detail body publishes one, and `col` indexes the visible data columns in pinned display order.

The grid has no cell range, no Shift+click or Shift+arrow on cells, no pointer drag on cells, no copy or paste keys, and no fill. The one clipboard path is the cell context menu's Copy, which writes one value through `copyText` (`utilities/export-output.ts`). Shift is not read by the cursor keys, and Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+D, Delete, and Backspace are unclaimed on the tab stop.

Row selection owns the names `selection`, `data-selected`, and `aria-selected`. A cell range must not reuse them.

The editing layer has no entry point that commits an arbitrary batch. `flushRow` runs the unchanged check and `validate` for drafts that a session closes. The module-level `sendHistory` sends undo and redo batches through `onCommit` and the async path, but it skips `validate`, the unchanged check, and `onReject`. Values reach the sink typed by the editor that staged them. No string-to-value parse exists, and `inferEditorKind` reads the `typeof` of the cell's current value (`text`, `number`, or `boolean`).

## Decisions

### The range model

- **Anchor plus cursor.** The navigation hook holds one more value, the anchor coord, in the same index space as the cursor. No anchor means no range, and the grid behaves as today. The rectangle is `min`/`max` of the two coords on each axis.
- **Data rows only.** A rectangle over a grouped or detail order covers only the `data` stops inside it. Group headers, totals, and detail panels inside the rectangle are not in the range, and copy, paste, and fill step over them. The anchor can sit only on a data stop.
- **Excluded places.** The new-row slot (`NEW_ROW_INDEX`) and non-data columns (selection, actions, handle, expander) are never in a range. Manual grouping stands the cursor down, so it stands the range down too.
- **A change of order clears the range.** A sort, a filter, a search, a page change, a regroup, a column reorder, or a column hide or show clears the anchor in `reconcile`. The cursor keeps its current reseat rule. A rectangle that follows its cells by key through a re-sort has no meaningful shape, so a clear is the honest result.
- **Per-cell flag, same store.** `GridNavStore` gains `isInRange(row, col)`. `GridNavCell` subscribes to it as it does to `isActive`, and toggles `data-in-range` on its `<td>`. A range change notifies every subscriber, but only cells whose flag flips render, which is the cursor's cost profile today. The recipe adds a `data-[in-range]:` tint and a hairline outline beside the ring in `k.nav`.
- **Uncontrolled.** The range has no binding and no `onRangeChange` in this plan. The `GridHandle` does not change. A consumer need for either is a later increment, and the anchor coord does not foreclose one.

### Gestures

- **Keys.** Shift with Arrow, Home, End, PageUp, and PageDown moves the cursor and keeps the anchor. Shift with Ctrl/Cmd+Home or Ctrl/Cmd+End extends to the grid corners. The first Shift move sets the anchor at the cursor's start. A move without Shift clears the anchor. Escape clears the range first, and the next Escape clears the cursor as today.
- **Pointer.** Shift+click extends the range to the clicked cell. A primary-button drag from a data cell sets the anchor on the press and moves the cursor with the pointer. The drag listens on the window until the release, and resolves the cell under the pointer with `elementFromPoint` and its `role="gridcell"` id. Near the scroll region's edge, the region scrolls so a windowed body mounts the next rows. A move that the pointer makes does not scroll the row into the window, because the cell is on screen, and that scroll would fight the edge scroll. A drag that starts on interactive cell content, or from a touch pointer, does not start a range, so touch scroll and text controls keep their gestures.
- **Space is unchanged.** Space still toggles the active row's selection. A range does not select rows, and row selection does not make a range.

### Copy

- **Ctrl/Cmd+C on the tab stop** writes the range, or the cursor cell without a range, as TSV through the native `copy` event's `clipboardData`. The event is synchronous and needs no clipboard permission, which `navigator.clipboard.writeText` does not give. With no text selection, Chromium sends the event to the body, not to the focused table, so the grid listens on the document and acts only while its tab stop has focus and no text is selected.
- **Values** come from `columnAccessor` and `cellText`, which export uses. Rows join with `\n`, and cells with `\t`. A cell that holds a tab, a newline, or a double quote gets double quotes, as spreadsheets write TSV. Rows and columns step over the excluded stops above.
- **Formula guard.** A copied cell passes through `neutralizeFormula`, which becomes an export of `utilities/export-output.ts`. The clipboard reaches a spreadsheet as a CSV file does, so the same guard applies. Paste removes that one guard apostrophe, so a copy and a paste inside the grid give back the same text.
- **Copy needs no editing.** It works on any grid with the range on.

### Paste

- **Ctrl/Cmd+V on the tab stop** reads `text/plain` from the native `paste` event and parses it as TSV (quoted fields, `\r\n` or `\n` rows, one trailing newline dropped). A paste into an open editor stays the editor's own, because the event target is not the tab stop.
- **Placement.** With a 1×1 clipboard, the value goes into every cell of the range. With a range that is a whole multiple of the block on both axes, the block tiles the range. Otherwise the block starts at the range's top-left corner (or the cursor), and it keeps its own size. A block that runs past the last data row or the last data column is cut at the edge. Paste never adds rows, and `newRow` stays the only way to add one.
- **Target cells.** A cell takes a value only when its column passes `isColumnEditable` and has a `field`. An `editCell` column without a `field` is skipped, because its value domain belongs to its slot. A cell that holds a draft (staged or pending) is skipped, as the history skips a drafted entry. The announcement counts each skipped cell.
- **Values.** A column can give a `parse?: (text: string, row: T) => unknown`, a new optional member of `GridColumn`. Without it, the grid coerces the text to the kind of the cell's current value: a number through `parseNumeric`, which sort and filter already use; a boolean from `true`/`false`, `yes`/`no`, or `1`/`0`; and text as is. An empty text clears a number or a boolean cell, as its empty editor does. A text that does not coerce becomes a refused cell, which goes to `onReject` beside the `validate` refusals, in one call for the paste.
- **One action.** The whole paste is one history entry, so one Ctrl/Cmd+Z undoes it. An async `onCommit` records each row's batch as it settles, as a save across rows does. The announcement names the count: `12 cells pasted`, `12 cells pasted, 2 skipped`.

### Fill

- **Keys.** Ctrl/Cmd+D fills down: the top row of the range goes into each row below it. Ctrl/Cmd+R fills right from the leftmost column. Both need a range more than one cell deep on their axis. The browser binds both keys (bookmark, reload), so each claims its key only when it acts, and a browser test proves the `preventDefault` holds.
- **Context menu.** The cell context menu gains Fill down and Fill right while a range is on. These are the single-pointer route that WCAG 2.5.7 asks for beside the fill handle's drag.
- **Fill handle.** A small square on the cursor corner of the range, rendered by the cell that holds the cursor while the range is on and the grid is editable. A drag from it grows the range along one axis, the axis of the larger pointer travel. On release, the source rectangle fills the new cells.
  **Since reversed.** [#1687](https://github.com/charliebeckstrand/midgard/pull/1687) shows the handle in one overlay of the table, on the bottom end corner of the active cell, so a move of the cursor renders no cell for it. The handle also shows when no range is on, and a drag then grows the range from the active cell.
- **Series.** When the source runs along the fill axis and holds two or more numbers with a constant step, the fill continues that step (`1, 2` fills `3, 4, 5`). Every other source repeats. Dates are not a series, because the grid has no date kind.
- **One action.** A fill commits the same way as a paste: one batch, one history entry, one announcement (`6 cells filled`).

### The commit entry point

- **`submitCells`.** `use-grid-editing.ts` gains one internal function that takes `GridCellChange[]` and an outcome word. It groups the changes by row, runs the unchanged check and `validate` per cell as `flushRow` does, calls `onReject` for the refusals, calls `onCommit` once per row, records one history entry, tracks an async result through `trackBatch` and `settleBatch`, and announces with `describeCommit`.
- **Undo and redo** move onto `submitCells` with `validate` off, because the values they send already passed it once. Their behavior does not change, and the existing history tests hold it.
- **Paste and fill** call `submitCells` with `validate` on. They do not open a session, do not touch the `rows` or `cell` bindings, and do not move focus.

### Gates and opt-in

- **`range?: boolean` on `GridDataProps`**, default `false`, needs `navigable`. It turns on the range, its keys, its pointer gestures, and copy. A default grid keeps its mouse text selection and its current keys.
- **Paste and fill** also need `editable.session: 'managed'`, the setting that already gives the grid its other spreadsheet keys. A `'manual'` grid copies but does not write.

### Accessibility

- **No `aria-selected` on cells.** The rows carry it for row selection, and a second meaning on the cells would read as a row choice. The range speaks through the live region instead.
- **Announcement.** A settled range change says its size and its corners in column and row words, for example `3 by 4 range, Name row 2 to Status row 5`. A key-held extend announces once when the keys stop, not on each step.
- **Focus.** The tab stop keeps focus through every gesture here. Copy, paste, and fill move no focus, which WCAG 2.4.3 needs.
- **Visible range.** The state must meet 3:1 against the cell background in both modes (WCAG 1.4.11), and the cursor ring must stay visible on a tinted cell. A light tint cannot meet 3:1, so each cell of the range also takes a one-pixel inset outline in the ring's color. An outline does not stack with the ring's box shadow.

### React Compiler

The anchor, the rectangle, and the TSV, paste, and fill logic are pure functions in a new `engine/grid-range/` directory, so the seams have unit tests with no render. The hooks read the store and the index refs only in handlers and effects, and wrap the handlers in `useStableEvent`. No new module reads the TanStack table in render, and `use-grid-table.ts` stays the only one ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §10.7). Each new hook must compile, and the ledger must not grow ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §10.8).

## Increments

| PR | Scope | Size |
|---|---|---|
| 1 | `submitCells`: one internal batch commit, with undo and redo moved onto it. No behavior change. | S |
| 2 | `range`: the anchor, `isInRange`, `data-in-range`, Shift keys, Shift+click, pointer drag with edge scroll, the announcement, and copy as TSV. | L |
| 3 | Paste: the TSV parse, placement, `GridColumn.parse`, coercion, skips, and one history entry. | M |
| 4 | Fill: Ctrl/Cmd+D and Ctrl/Cmd+R, the context menu items, the fill handle, and the numeric series. | M |

Each PR adds TSDoc to each new public member, a demo segment in `src/docs/demos/modules/grid/`, and the surface index change in `packages/ui/docs` ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §12). The public additions are `GridDataProps.range` and `GridColumn.parse`. No new type exports.

## Tests

- **Unit, engine.** The rectangle from two coords over a grouped order, TSV write and parse with quotes and the formula guard, placement (fill, tile, cut), coercion per kind, and the series step.
- **Unit, grid.** `submitCells` against the existing history and async tests, the range clear on each order change, the key matrix with and without Shift, Escape twice, and a render-count test that a range change renders only the cells whose flag flips.
- **Browser.** Pointer drag with edge scroll under `virtualize`, the native `copy` and `paste` events, the `preventDefault` on Ctrl/Cmd+D and Ctrl/Cmd+R, and the fill-handle drag.
- **Bench.** A scenario in `grid-editing.bench.tsx` that extends a range across 1,000 rows by key, so the store fanout stays measured.

## Non-goals

- Several ranges at once (Ctrl/Cmd+click to add a rectangle).
- Select all cells with Ctrl/Cmd+A.
- Cut, and clear of a range with Delete or Backspace. A clear needs an empty value per kind, which the grid does not define. A later increment can add it on `submitCells`.
- A paste that adds rows past the last row.
- Date series, text series (`Item 1`, `Item 2`), and custom series.
- A range gesture for touch pointers. Touch keeps scroll, and the context menu keeps Fill down and Fill right.
- A controlled range binding and a handle method.

## Open questions

- **The settle pair.** A cell-scoped `editCell` slot with its own save still shows two saves (see the editing plan's increment 3 notes). This plan does not touch it, because paste and fill skip `editCell` columns without a `field` and open no session.
- **Rich clipboard.** A spreadsheet also writes `text/html`. This plan reads and writes only `text/plain`, and a later increment can add HTML if a consumer needs cell formats.
