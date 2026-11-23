# Grid roadmap

> **Goal: finish the spreadsheet model of the cell range, and keep each gesture measured.** The engine work is done: TanStack Table v9 holds only the column state, and the grid computes its rows itself. The open work is the range features that the first range release left out, a short list of AG Grid gaps, and two churn costs.

## Status

`Grid` ([`grid.tsx`](grid.tsx)) is the one component of the module. The barrel ([`index.ts`](index.ts)) exports it, its config types, and `useGridExportActions`.

A grid sorts on several columns, searches, and filters each column through a query-builder sheet. It groups on one column, on the client or on the server, and it aggregates into group totals and a grand total. It pages, scrolls without end, and windows its rows under `virtualize`. It edits by row or by cell, with undo and redo, and it adds rows through a new-row slot. The keyboard cursor, the cell range with copy, paste, and fill, and the column pins complete the core. Column groups, reorder, resize, export, and the context menus complete the surface.

The apps use a small part of this surface. The admin users grid sorts and gives an action on each row. The elections grid of uncalled races sorts and takes a row click. The index sheet of places adds a search, a toolbar filter, and a windowed body in a sheet. No app edits, selects a range, or groups.

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

1. **A range gesture for touch (*P3*).** [`use-grid-range-drag.ts`](use-grid-range-drag.ts) listens for mouse events only, so a touch pointer cannot make a range. A long press that starts a range, then a drag that extends it, is the Google Sheets model. The open question is the conflict with the scroll of the region and with the long press that opens the context menu. A browser test beside [`grid-range-pointer.test.tsx`](../../__tests__/browser/grid-range-pointer.test.tsx) must prove it.

2. **Pinned rows (*P3*).** AG Grid (`pinnedTopRowData`) and MUI X (`pinnedRows`) hold rows at the top or the bottom of the body while it scrolls. The new-row slot is already an internal pinned row, and the grand total is a row after the body. A public `pinnedRows` binding can reuse that slot. The open questions are the cursor stop of a pinned row and its place in sort, filter, and export.

3. **Column virtualization (*P3*).** The body renders each visible column of each windowed row. AG Grid windows columns too, and the column manager already holds its own cost down at hundreds of columns ([`grid-group-manager.bench.tsx`](../../__benchmarks__/browser/grid-group-manager.bench.tsx)). The open questions are the content fit of [`grid-sizing/measure.ts`](engine/grid-sizing/measure.ts), which reads each column, and the sticky offsets of the pins. A wide-grid scenario in [`grid-scroll.bench.tsx`](../../__benchmarks__/browser/grid-scroll.bench.tsx) must come first, to show the cost.

## Performance

Each change follows the loop of the [browser benchmark README](../../__benchmarks__/browser/README.md): a snapshot before, the change, and the same run after, row by row. The node benches and the pure cores then find the responsible function. [`grid-row-passes.test.tsx`](../../__tests__/modules/grid-row-passes.test.tsx) asserts the passes that each gesture makes over the loaded rows, and the commits of each gesture. A change that removes a pass changes its entry in `PASSES` in the same commit.

1. **Window-scoped row arrays (*P2*).** The windowed body reads arrays of every loaded row. A cached sort flip copies the rows and the keys in view order. A refresh and an append each build arrays of the whole set. A window renders only its rows, so these arrays can cover the window and not the set. The windowed `PASSES` of [`grid-row-passes.test.tsx`](../../__tests__/modules/grid-row-passes.test.tsx) record one pass of `getKey` over the loaded rows for a flip, a refresh, and an append. The change removes those passes, and [`grid-scroll.bench.tsx`](../../__benchmarks__/browser/grid-scroll.bench.tsx) must not regress.

2. **A sort decode with no object for each row (*P2*).** `toSortKey` in [`engine/grid-sort/utilities.ts`](engine/grid-sort/utilities.ts) makes one `SortKey` object for each row, with the date, boolean, numeric, and text fields of the value. A sorted refresh decodes each loaded row one time, and so does the first flip of a sort. Typed parallel arrays (a `Float64Array` for the numbers and times, a `Uint8Array` for the kind, and one array of text) can hold the same keys. The `toSortKey` and `computeSortOrder` rows of [`grid-sorting.bench.ts`](../../__benchmarks__/grid-sorting.bench.ts) prove it, and the comparator tests must still pass.

## Accessibility and testing

1. **Forced colors for the range and the fill handle (*P2*).** A cell of the range shows by a blue outline and a tint. The fill handle shows by its background and a border ([`recipes/kata/grid.ts`](../../recipes/kata/grid.ts)). Forced colors remove the tint and replace the colors, and no test examines either part. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §5.10 asks each such part to keep a mark. Add a range case and a fill-handle case to [`forced-colors-indicators.test.tsx`](../../__tests__/browser/forced-colors-indicators.test.tsx), and add a `sen.forced` entry where the mark is lost.

2. **A bench for the writes of a range (*P2*).** [`grid-range.bench.tsx`](../../__benchmarks__/browser/grid-range.bench.tsx) times the extend and the shrink of a range, and no bench times a paste or a fill. A paste of a large block goes through `parse` and `validate` for each cell, one `onCommit`, and one history step. Add a paste scenario and a fill-down scenario on the editable grid of that file, at 1,000 rows without a window. Items 3 and 4 of Features then change a measured path.

## Not planned

- An imperative repaint of the sort, which reorders the window in place from the cached order. On 2026-11-21, at 100,000 rows of a string column, [`grid-sorting.bench.ts`](../../__benchmarks__/grid-sorting.bench.ts) gave `computeSortOrder` about 58 ms and `materializeSort` about 2.3 ms. The cached order already removes the costly half, and the rest of a browser sort is the top-level commit and the virtualizer. The window is a small set of memoized rows that React moves, not mounts, so a repaint attacks a small surface. Reopen it only when a profile puts real time on the reconciliation of the window.

- A `Uint32Array` for the sort order. The order is an array of small integers, which V8 already keeps packed with no boxing. The cost of a sort is in the decode of the keys, and Performance item 2 takes that cost.

- Several ranges at once. Copy, paste, and fill have no defined shape for ranges that do not touch, and Excel refuses a copy of most such ranges. Ctrl+click is also a browser gesture (`hasBrowserModifier`, [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §3.10).

- Nested grouping and tree data. The owner took nested grouping off this tracker. The grouped bodies, the `aria-level` values, the group totals, and the positional children of manual grouping all assume one level.

- Pivot mode. No app needs it, and a pivot changes the columns from the data, which the column state of the engine does not model.

- `aria-selected` on the cells of a range. The rows keep `aria-selected` for the row selection, and a second selection state on the same rows reads as one state. The live region gives the size and the corners of the range.

- Logical names for the pin sides. `GridPinningState` and `GridColumn.pinned` take `'left'` and `'right'`, and the TSDoc states that each means an inline side. A rename breaks each consumer, and AG Grid uses the same names.

---

**See also:** [`__benchmarks__/browser/README.md`](../../__benchmarks__/browser/README.md) (the browser suite and its methodology) · [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
