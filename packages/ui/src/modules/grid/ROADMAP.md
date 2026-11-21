# Grid roadmap

> **Goal: finish the spreadsheet model of the cell range and the row selection, and keep each gesture measured.** The engine work is done: TanStack Table v9 holds only the column state, and the grid computes its rows itself. The open work is the range features that the first range release left out, a short list of AG Grid gaps, and two churn costs.

## Status

`Grid` ([`grid.tsx`](grid.tsx)) is the one component of the module. The barrel ([`index.ts`](index.ts)) exports it, its config types, and `useGridExportActions`.

A grid sorts on several columns, searches, and filters each column through a query-builder sheet. It groups on one column, on the client or on the server, and it aggregates into group totals and a grand total. It pages, scrolls without end, and windows its rows under `virtualize`. It edits by row or by cell, with undo and redo, and it adds rows through a new-row slot. The keyboard cursor, the cell range with copy, paste, and fill, and the column pins complete the core. Column groups, reorder, resize, export, and the context menus complete the surface.

The apps use a small part of this surface. The admin users grid and the elections grid of uncalled races sort and take a row click. The index sheet of places adds a search, a toolbar filter, and a windowed body in a sheet. No app edits, selects a range, or groups.

TanStack Table holds the column state: order, visibility, pins, sizes, and the resize gesture ([`engine/grid-table/features.ts`](engine/grid-table/features.ts)). The grid filters, sorts, and pages in [`use-grid-client-view.ts`](use-grid-client-view.ts), and it groups in [`use-grid-group-tree.ts`](use-grid-group-tree.ts). The engine builds no row model. Parity tests hold the client view equal to a stock engine table, which [`helpers/grid-engine.ts`](../../__tests__/helpers/grid-engine.ts) builds.

[`use-grid-table.ts`](use-grid-table.ts) is the only module that reads the table during render, so no compiled read goes stale ([`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §10.7). [`engine-handle-boundary.test.ts`](../../__tests__/boundary/engine-handle-boundary.test.ts) and the `no-value-import-from-tanstack-table` Biome plugin hold the rule.

The grid loads `@dnd-kit` only for a reorder, its dialogs only when one opens, and its editing layer only when it is editable. [`grid-lazy-boundary.test.ts`](../../__tests__/boundary/grid-lazy-boundary.test.ts) walks the static graph, and [`grid-editing-load.test.tsx`](../../__tests__/boundary/grid-editing-load.test.tsx) counts the loads of the editing layer.

A provider above the body keeps its value on a row toggle, a sort, or a cursor move. A context change otherwise reaches each memoized row, which then walks its cells. [`grid-body-providers-render.test.tsx`](../../__tests__/boundary/grid-body-providers-render.test.tsx) holds the rule.

Each cell reads its own range flag from the cursor store, so a range change renders only the cells whose flag flips. [`grid-range-render.test.tsx`](../../__tests__/boundary/grid-range-render.test.tsx) holds the rule. A resize renders no cell that the reader did not visit, and [`grid-resize-drag-render.test.tsx`](../../__tests__/boundary/grid-resize-drag-render.test.tsx) counts those renders.

Each write of a paste or a fill goes through `editable.onCommit`, the sink of an editor save. Thus a paste or a fill is one save and one step of the history.

## Engine

[`engine/`](engine) is the pure functional core of the module. It is a d3-style library of functions that each feature slice calls, and a test or a bench can call each function outside React. It has no `'use client'`, no runtime import of `react`, `motion`, `@dnd-kit`, or `@floating-ui`, no runtime import from the module root, and no `index` barrel. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for each engine on its `PURE_ENGINES` list.

A type-only import is legal, because it erases. [`grid-reorder-compute.ts`](engine/grid-reorder-compute.ts) imports the types of `@dnd-kit/core` and `@dnd-kit/utilities`, and the gate has a self-check for that case. [`grid-zone/map.ts`](engine/grid-zone/map.ts) reorders through `moveItem` from `utilities/move-item.ts`, not through `arrayMove` of `@dnd-kit/sortable`.

[`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) holds the layout. A file directly under `engine/` takes the `grid-` prefix. A concept with more than one file goes in a `grid-<concept>/` folder, such as [`grid-range/`](engine/grid-range), with short file names and no nested folder.

Each shared rule has one definition, so its tests prove an optimization safe before a bench proves it fast. The comparator is in [`grid-sort/utilities.ts`](engine/grid-sort/utilities.ts), and the column sizing rules are in [`grid-sizing/sizer.ts`](engine/grid-sizing/sizer.ts).

## Features

1. **Clear and cut a range (*P2*).** Delete and Backspace on the grid tab stop must clear each cell of the range, or the active cell with no range. Ctrl/Cmd+X must copy as Ctrl/Cmd+C does, and then clear. AG Grid, Excel, and Google Sheets have both keys, and the range of this grid can paste but not empty a cell. A clear is a paste of an empty field into each cell. It goes through `pastePlacement` in [`engine/grid-range/paste.ts`](engine/grid-range/paste.ts), `pasteChange` in [`engine/grid-edit-commit.ts`](engine/grid-edit-commit.ts), `parse`, `validate`, and `onCommit`. Cases in [`grid-range-paste.test.tsx`](../../__tests__/modules/grid-range-paste.test.tsx) and the [`paste-and-fill`](../../docs/pages/modules/grid/editing/paste-and-fill.tsx) demo prove it.

2. **Select all cells (*P2*).** Ctrl/Cmd+A on the grid tab stop must make a range from the first data cell to the last. The WAI-ARIA APG grid pattern names this key for a grid with cell selection, and AG Grid gives it. The key goes beside the range keys in [`use-grid-navigation.ts`](use-grid-navigation.ts), and the corner extend of Shift+Ctrl/Cmd+End already gives the cells. A case in [`grid-range.test.tsx`](../../__tests__/modules/grid-range.test.tsx) proves the range and its announcement.

3. **An HTML table on the clipboard (*P2*).** A copy writes only `text/plain` TSV in `copyRange` of [`use-grid-cursor-nav.ts`](use-grid-cursor-nav.ts). AG Grid and Google Sheets also write `text/html`, so a paste into a document or a mail keeps the table. The copy must also write the block as an HTML table with the `escapeMarkup` of [`engine/grid-export/accessor.ts`](engine/grid-export/accessor.ts), as [`html-table.ts`](engine/grid-export/html-table.ts) does for an export. A paste keeps the TSV path, because a spreadsheet writes TSV too. A case in [`grid-range.test.tsx`](../../__tests__/modules/grid-range.test.tsx) reads both types through `stubClipboard`.

4. **Row selection by span and by predicate (*P2*).** Shift with a click on a row checkbox must select each row between the last toggled row and this one. A `rowSelectable` predicate on `GridSelection` must disable the checkbox of a row that it rejects, and select-all must skip that row. AG Grid has both (`isRowSelectable`), and MUI X DataGrid has both. The work is in [`use-grid-selection.ts`](use-grid-selection.ts) and [`grid-row-special-cell.tsx`](grid-row-special-cell.tsx), and [`use-grid-selection.test.ts`](../../__tests__/modules/use-grid-selection.test.ts) and the [`selection`](../../docs/pages/modules/grid/selection/selection.tsx) demo prove it.

5. **A full preset snapshot (*P2*).** `onSavePreset` gives only the order and the hidden ids (`grid-column-manager.tsx`), but its type is `GridPreferences`, which also holds the widths and the pins. A preset that loses the widths and the pins does not restore the layout that the reader saved. AG Grid gives the width and the pin of each column in its column state. The column manager must take the sizing and the pin state from [`use-grid-data-render.tsx`](use-grid-data-render.tsx) and put them in the snapshot. A case in [`grid-preferences.test.tsx`](../../__tests__/modules/grid-preferences.test.tsx) proves the round trip through `preferences`.

6. **A controlled range (*P2*).** `range` is a boolean, so an app cannot read, seed, or clear the range. AG Grid gives `onRangeSelectionChanged` and `addCellRange`. `range` must also take `{ value, defaultValue, onValueChange }`, as `reorder` takes `boolean | GridReorder`, with corners that name a row key and a column id. A row key keeps its meaning across a sort, where a row index does not. Cases in [`grid-range.test.tsx`](../../__tests__/modules/grid-range.test.tsx) and the [`cell-range`](../../docs/pages/modules/grid/events/cell-range.tsx) demo prove it.

7. **Range figures in the footer (*P3*).** The AG Grid status bar shows the count, the sum, and the average of the range. `GridFooterStats` can carry these figures from `cachedAggregate` in [`engine/grid-aggregate.ts`](engine/grid-aggregate.ts). The open questions are the opt-in on `GridFooter` and the cost of an extend across many rows. It depends on item 6, which defines the range as a value. Each extend then needs a bench row in [`grid-range.bench.tsx`](../../__benchmarks__/browser/grid-range.bench.tsx).

8. **Date and text series in a fill (*P3*).** `fillLine` in [`engine/grid-range/fill.ts`](engine/grid-range/fill.ts) continues only a series of numbers and repeats each other line. Excel and Google Sheets also continue dates by a constant step and text such as `Item 1`, `Item 2`. The open questions are the step unit of a date (day, month, or year) and the parse of a number that ends a text. Cases in [`grid-range-fill.test.tsx`](../../__tests__/modules/grid-range-fill.test.tsx) must hold the series that the fill gives today.

9. **A paste that adds rows (*P3*).** A paste stops at the last row, and the TSDoc of `range` says that a paste adds no rows. Google Sheets and Excel add the rows that the block needs. The new-row slot (`editable.newRow`, [`engine/grid-new-row.ts`](engine/grid-new-row.ts)) already gives the values of a new row to `onRowAdd`. A paste can add one row for each extra line in the same way. The open questions are the key of a row that the consumer has not added yet, and one history step for the whole paste.

10. **A range gesture for touch (*P3*).** [`use-grid-range-drag.ts`](use-grid-range-drag.ts) listens for mouse events only, so a touch pointer cannot make a range. A long press that starts a range, then a drag that extends it, is the Google Sheets model. The open question is the conflict with the scroll of the region and with the long press that opens the context menu. A browser test beside [`grid-range-pointer.test.tsx`](../../__tests__/browser/grid-range-pointer.test.tsx) must prove it.

11. **Pinned rows (*P3*).** AG Grid (`pinnedTopRowData`) and MUI X (`pinnedRows`) hold rows at the top or the bottom of the body while it scrolls. The new-row slot is already an internal pinned row, and the grand total is a row after the body. A public `pinnedRows` binding can reuse that slot. The open questions are the cursor stop of a pinned row and its place in sort, filter, and export.

12. **Column virtualization (*P3*).** The body renders each visible column of each windowed row. AG Grid windows columns too, and the column manager already holds its own cost down at hundreds of columns ([`grid-group-manager.bench.tsx`](../../__benchmarks__/browser/grid-group-manager.bench.tsx)). The open questions are the content fit of [`grid-sizing/measure.ts`](engine/grid-sizing/measure.ts), which reads each column, and the sticky offsets of the pins. A wide-grid scenario in [`grid-scroll.bench.tsx`](../../__benchmarks__/browser/grid-scroll.bench.tsx) must come first, to show the cost.

## Pattern cleanup

1. **One verb form for the menu builders (*P2*).** [`grid-context-menu-utilities.tsx`](grid-context-menu-utilities.tsx) holds `buildColumnGroupMenu` and `buildRowGroupMenu` beside `columnMenuDefaults`, `cellMenuDefaults`, `fillItems`, and `gridExportMenuItems`. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §8.5 starts a builder name with `build`, and §8.4 drops the `grid` that the file already names. Rename them to `buildColumnMenu`, `buildCellMenu`, `buildFillItems`, and `buildExportItems`. Other noun names of the module, such as `cellValue` or `frozenOffsets`, have the same drift, but each concept folder needs its own review.

2. **An editing concept folder in the engine (*P3*).** The editing files sit directly under `engine/`: `grid-edit-commit.ts`, `grid-edit-focus.ts`, `grid-edit-history.ts`, `grid-edit-keys.ts`, `grid-edit-leave.ts`, `grid-edit-transition.ts`, `grid-editing-utilities.ts`, and `grid-active-edit-store.ts`. The engine layout puts a concept with more than one file in a `grid-<concept>/` folder, as `grid-range/` and `grid-sort/` do. A `grid-edit/` folder with short names (`commit.ts`, `history.ts`, `store.ts`) makes the concept one unit. [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) then holds the short names. The open question is whether the gain is worth the churn of each import in the tests.

## Performance

Each change follows the loop of the [browser benchmark README](../../__benchmarks__/browser/README.md): a snapshot before, the change, and the same run after, row by row. The node benches and the pure cores then find the responsible function. [`grid-churn.bench.tsx`](../../__benchmarks__/grid-churn.bench.tsx) asserts the heap bytes that each gesture allocates for each loaded row, and `pnpm bench:smoke` asserts its `BUDGETS` on each pull request. A change that removes churn lowers its budget in the same commit.

1. **Window-scoped row arrays (*P2*).** The windowed body reads arrays of every loaded row. A cached sort flip copies the rows and the keys in view order. A refresh and an append each build arrays of the whole set. A window renders only its rows, so these arrays can cover the window and not the set. On 2026-11-21, the windowed `BUDGETS` of [`grid-churn.bench.tsx`](../../__benchmarks__/grid-churn.bench.tsx) hold 16 bytes for each row for a flip, 8 for a refresh, and 16 for an append. The change lowers those budgets, and [`grid-scroll.bench.tsx`](../../__benchmarks__/browser/grid-scroll.bench.tsx) must not regress.

2. **A sort decode with no object for each row (*P2*).** `toSortKey` in [`engine/grid-sort/utilities.ts`](engine/grid-sort/utilities.ts) makes one `SortKey` object for each row, with the date, boolean, numeric, and text fields of the value. On 2026-11-21, `BUDGETS` holds 154 bytes for each row for a sorted refresh on a paged grid, and 170 on a windowed grid. These are the largest slopes in the file. Typed parallel arrays (a `Float64Array` for the numbers and times, a `Uint8Array` for the kind, and one array of text) can hold the same keys. The `toSortKey` and `computeSortOrder` rows of [`grid-sorting.bench.ts`](../../__benchmarks__/grid-sorting.bench.ts) and the sorted-refresh budgets prove it, and the comparator tests must still pass.

## Accessibility and testing

1. **Forced colors for the range and the fill handle (*P2*).** A cell of the range shows by a blue outline and a tint. The fill handle shows by its background and a border ([`recipes/kata/grid.ts`](../../recipes/kata/grid.ts)). Forced colors remove the tint and replace the colors, and no test examines either part. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §5.10 asks each such part to keep a mark. Add a range case and a fill-handle case to [`forced-colors-indicators.test.tsx`](../../__tests__/browser/forced-colors-indicators.test.tsx), and add a `sen.forced` entry where the mark is lost.

2. **A bench for the writes of a range (*P2*).** [`grid-range.bench.tsx`](../../__benchmarks__/browser/grid-range.bench.tsx) times the extend and the shrink of a range, and no bench times a paste or a fill. A paste of a large block goes through `parse` and `validate` for each cell, one `onCommit`, and one history step. Add a paste scenario and a fill-down scenario on the editable grid of that file, at 1,000 rows without a window. Items 1 and 9 of Features then change a measured path.

## Not planned

- An imperative repaint of the sort, which reorders the window in place from the cached order. On 2026-11-21, at 100,000 rows of a string column, [`grid-sorting.bench.ts`](../../__benchmarks__/grid-sorting.bench.ts) gave `computeSortOrder` about 58 ms and `materializeSort` about 2.3 ms. The cached order already removes the costly half, and the rest of a browser sort is the top-level commit and the virtualizer. The window is a small set of memoized rows that React moves, not mounts, so a repaint attacks a small surface. Reopen it only when a profile puts real time on the reconciliation of the window.

- A `Uint32Array` for the sort order. The order is an array of small integers, which V8 already keeps packed with no boxing. [`grid-churn.bench.tsx`](../../__benchmarks__/grid-churn.bench.tsx) puts the churn of a sort in the decode of the keys, and Performance item 2 takes that cost.

- Several ranges at once. Copy, paste, and fill have no defined shape for ranges that do not touch, and Excel refuses a copy of most such ranges. Ctrl+click is also a browser gesture (`hasBrowserModifier`, [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §3.10).

- Nested grouping and tree data. The owner took nested grouping off this tracker. The grouped bodies, the `aria-level` values, the group totals, and the positional children of manual grouping all assume one level.

- Pivot mode. No app needs it, and a pivot changes the columns from the data, which the column state of the engine does not model.

- `aria-selected` on the cells of a range. The rows keep `aria-selected` for the row selection, and a second selection state on the same rows reads as one state. The live region gives the size and the corners of the range.

- Logical names for the pin sides. `GridPinningState` and `GridColumn.pinned` take `'left'` and `'right'`, and the TSDoc states that each means an inline side. A rename breaks each consumer, and AG Grid uses the same names.

---

**See also:** [`__benchmarks__/browser/README.md`](../../__benchmarks__/browser/README.md) (the browser suite and its methodology) · [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
