# Grid roadmap

> **Goal: AG-Grid-class power on a TanStack Table engine.** The Grid is migrating from a bespoke, consumer-driven data grid to one backed by [`@tanstack/react-table`](https://tanstack.com/table), so its feature set grows by adopting TanStack's row models rather than hand-rolling each capability. This file tracks the migration and the feature backlog.

## Status

The TanStack Table engine is now in place. `useGridTable` builds a `useReactTable` instance, adapting `GridColumn[]` to `ColumnDef[]` and `getKey` to `getRowId`, and routes row data through the table's row model.

Pagination is the first feature on the engine: server-side (`manualPagination`) and client-side, bound through the controllable `pagination` prop, with a footer carrying a row-range status, page navigation, and an optional page-size picker. The row model is only materialized when pagination is active, so unpaginated grids are unchanged.

Resizable columns are the second: the `resizable` prop wires TanStack's column-sizing API (`enableColumnResizing`, `columnResizeMode`, `column.getSize()`), each data-column header gaining a keyboard-accessible `role="separator"` resize handle, with widths persisted through the controllable `columnSizing` prop. Under `resizable` the table switches to fixed layout with a `<colgroup>` of exact widths and a table width summing them, so resizing one column changes only that column (and the table's total width) — siblings hold their size and the table scrolls — rather than redistributing across the row.

Filtering is the third: columns gain an optional `value` accessor, then quick search (`search`) and per-column filters both drive TanStack's `getFilteredRowModel` (client) or `manualFiltering` (server). A `filterable` column shows a Filter button in its header opening a right-side Sheet with a single-column query builder (from [`modules/query`](../query)) — operator + value rules joined by AND/OR, typed per the column's `filterType` (`text` / `number` / `select` / `date` / `boolean`, the last two rendering a date picker and an is-true/is-false toggle) — applied to rows by the query evaluator. Edits stay in a draft until the sheet's **Apply** settles them onto the engine; Cancel, Escape, or a backdrop press discards the draft, so the applied filter stands. A **Reset** button, left-aligned across from the Cancel / Apply pair, lifts the applied filter outright (and closes), offered only while a filter is in effect. Operator and date-picker menus inside the sheet layer above its backdrop (the modal overlay hosts nested floating surfaces). A `number` column also offers a two-bound `between` range, either end optionally left open. A `select` column with no `filterOptions` offers the column's own values instead, faceted from the data (`getFacetedUniqueValues` over the rows other filters leave, sorted and de-duplicated). The button reads active only when a rule actually constrains rows (a non-empty value, a one-sided range, or a value-less operator like "is empty"), not merely because a rule exists; a rule the builder reads as inactive imposes no constraint on rows either, so clearing a value (or applying an all-blank query) restores the hidden rows rather than hiding them all.

Sorting is the fourth: data columns are sortable and sorted client-side by default — the engine orders `rows` through `getSortedRowModel` by each column's `value` accessor, or the row field named by the column id when none is given. The default comparator is smart: it reads numbers, comma-grouped numbers, currency, percentages, accounting negatives, dates, and booleans by value, and falls back to a natural, locale-aware string compare (so `Item 2` precedes `Item 10`) — the cases a lexical sort mangles. A column's `sortFn` (rows in, ascending order out) overrides it with a manual client-side comparator. A plain header click cycles the column tri-state, ascending → descending → unsorted, collapsing the sort to that one column; a Shift-click folds the column into the existing sort instead — appending it ascending, flipping it to descending, then dropping it — leaving the other columns and their priority order in place. The sort binding is an ordered list (`SortState[]`, highest priority first; the empty list is unsorted), the engine orders by all of it (`enableMultiSort`), and each sorted header carries a 1-based priority badge once more than one column sorts. The header right-click menu's Sort ascending / descending set a single-column sort (Clear sort empties it); multi-column is the Shift-click path. Opt a column out with `sortable: false` (or grid-wide with `sortable={false}`), and switch to server-side ordering with `sort.manual: true`, where the consumer sorts `rows` by the same list.

Context menus are the fifth, and on by default (`contextMenu={false}` opts out): a cursor-anchored right-click menu — a column menu on headers (Sort ascending / descending, Clear sort once the column is sorted, Auto-size columns when resizing is on, Manage columns, which opens the column manager) and a cell menu on body cells (Copy). The column menu also carries the pin controls (Pin left / Pin right / Unpin), withheld on a `locked` column. Holding Ctrl during the right-click defers to the browser's standard menu. Each side reshapes through a builder that receives the default items. It composes the `Menu` primitive.

Auto-sizing is the sixth, and now content-aware: data columns measure their rendered content and size to it on mount, on container resize (via `ResizeObserver`), when the columns / density / rows change, and once web fonts settle. Each pass reads the intrinsic widths of the rendered cells and header (unclipped by the current column widths, so re-measuring never feeds back), then distributes the container width in two regimes — when the content fits with room to spare the surplus lifts the narrowest columns toward an equal width (a column whose data would truncate gains the room while columns that don't settle at the shared level); when it doesn't, the columns hold at their content widths and the table overflows horizontally rather than squishing to truncate. A single-word header reserves its full width and never truncates; a multi-word or non-string header reserves only its affordance icons plus a small allowance, so a column with narrow data stays narrow and that header truncates. A column `width` supersedes the system (a fixed width), and a controlled `columnSizing` stands it down entirely. A drag-resize holds that one column at its width while the rest keep fitting; the header's "Auto-size columns" action clears the manual holds and re-fits. The measurement (`grid-column-measure`), the pure two-regime allocator (`grid-column-allocate`), and the orchestrating hook (`use-grid-column-auto-size`) are separate units.

Truncation is the seventh, and on by default (`truncate={false}` opts out, as the editable variant does): overflowing cell content — and column titles — clip to one line with an ellipsis instead of spilling across neighbours, visible wherever the column width is bounded (a resizable/fixed-layout grid). A truncated cell reveals its full content in a hover/focus `Tooltip`; a column's `cellTooltip` returns a node to supersede that content or `null` to disable it. A truncated header title reveals itself the same way, the title shrinking within the header's flex slot — and, when sortable, within the sort button — so the ellipsis engages around the sort/filter/resize chrome rather than the title overrunning the cell. Both surfaces share one overflow detector (`useGridTruncation`), measured eagerly at sub-pixel precision (a `Tooltip` can't open mid-hover on an `enabled` flip), and mount a tooltip only while truncated. The tooltip's floating surface mounts its portal only while open (see `FloatingSurface`), so a grid of many cells leaves no `[data-floating-ui-portal]` nodes behind at rest — the styled reveal without a per-cell portal flood. Truncation needs a bounded column width: a `resizable`/fixed-layout grid, or a column `width`; an auto-layout column sizes to its content instead.

Export is the eighth, opt-in via `exportable`: `true` enables the default set — CSV, Excel, and print — each surfaced as one item in the header and cell right-click menus and in a toolbar "Export" dropdown; an explicit `GridExportEntry[]` array picks a subset, reorders them, or overrides a type's `onExport` (required for any type beyond the three built-ins). Every type reads the same rows — the grid's filtered and sorted set (all pages, from the engine's sorted row model), or just the selected rows when a selection is active — each cell through its column's `value` accessor (the same one sort and filter use), falling back to the row field named by the column id; non-data columns (selection, actions) and columns with neither a `value` nor a matching field drop out or blank. CSV downloads an RFC 4180 file (UTF-8 BOM led, for spreadsheet apps); Excel downloads an HTML table wrapped in the `.xls`-openable Microsoft namespace shell (no added dependency, but no real `.xlsx` styling/formulas); print opens the browser dialog over a printable HTML table through a hidden iframe. The implementation lives in `export/` — `types.ts`, one file per built-in (`csv.ts` / `excel.ts` / `print.ts`), `registry.ts`, and `resolve.ts` — with `use-grid-export.ts` binding it to the engine's row model; a `column`/`cell`-menu builder reaches the same actions through its context's `exportActions`.

Column pinning is the ninth, declared per column via `pinned` (`'left'` / `'right'`, or `true` for left): the engine's `columnPinning` state freezes the column against horizontal scroll, sticking it to that edge at an offset summed from the engine (`column.getStart('left')` / `getAfter('right')`), over an opaque surface so the scrolling columns pass beneath it, with each frozen column bordered on the edge facing the scroll (right for a left-frozen column, left for a right-frozen one) and a separating shadow at each frozen group's inner boundary. Columns are stable-partitioned to their edge in display order (left-frozen first, the scrolling columns between, right-frozen last) so the header, body cells, and `<colgroup>` share one order while the sticky offsets stack from the edge inward. A frozen column is dropped from drag-reorder and the column manager's hide list, and listed in the manager's matching pinned group — left columns prepended, right appended. Stacking several columns on a side needs known widths (a `resizable`/fixed-layout grid, or a column `width`) so the offsets can sum; a lone frozen column on a side needs neither. The frozen header layers above the sticky header so the top corner stays on top, and below it on a vertical scroll so pinned cells tuck under the head. `pinned` is the column's initial pin; the header context menu's Pin left / Pin right / Unpin items and the column manager's per-row pin menu override it at runtime (an override map layered over the static flags), so a column can be frozen or released without touching the definitions. A sibling `locked` prop freezes a column the same way but immutably — no unpin button on its header, no pin items in its context menu, and a static edge arrow (not a pin control) in the manager — for freezes that are part of the grid's design rather than a user preference. One resolver, `frozenSide` (a column's `locked` side, else its `pinned` side, `true` being left), is the single edge derivation the engine state, the column slice, the header, and the menus all read.

Column groups are the tenth, opt-in via `groups` (a plain `GridColumnGroup[]` for the declarative case, or a `{ value, defaultValue, onValueChange }` binding the column manager mutates): a colored, labeled band drawn above a contiguous run of columns. Each group names its member `columns`, a `title`, a `color` from the standard + extended palette (rendered through `Badge`, so the presets match that surface, and drawn as a 2px underline under the band spanning the group's columns), and optionally a `description` tooltip, an `icon`, and a `collapsible` fold. Groups drive the display order so the grid matches the column manager: `groupedColumnOrder` leads with the groups' columns (in `groups` order, then each group's own `columns`) followed by the ungrouped columns, splicing that sequence back into the orderable-data slots (selection, actions, and frozen columns hold their place) — idempotent, so it re-derives every render. The header gains a band row above the column headers — one `<th>` per span from `buildGroupSpans`, a `colgroup`-scoped band over each maximal grouped run and a plain filler (which sticks to a pinned column's edge) over the rest — bumping the grid's `aria-rowcount` and the body's global row offset by one. A `collapsible` group folds to its first member behind an expand toggle, hiding the others through a `collapsedHidden` set unioned into the engine's `columnVisibility` (kept apart from the manager's user-hidden set, so collapsing never unchecks a column). When the column manager is on and a `groups` binding is supplied, its dialog's orderable region becomes a group editor: a "New group" button, a zone per group (a reorder handle, a name `Input`, a color `Listbox`, a remove button) and an ungrouped pool. Whole groups reorder as a vertical list — dragged by the handle beside each name, which sets the grid's group order — while columns move within and between zones (the house multi-container dnd: a live zone-map re-parents the dragged column on drag-over, with a `DragOverlay` standing in for the hidden source, and one collision resolver keeping the group and column sortables apart) or through a per-row "Move to" menu as the accessible alternative. Each edit commits through the `groups` binding (and the column `order` for the ungrouped pool). The slice is isolated: `grid-group-types`, the `use-grid-group` resolution hook, the `grid-group` band renderer, and the `grid-group-manager` / `use-grid-group-manager` editor. Pinned columns stay out of a band (they partition to an edge, away from their group); multi-level (nested) groups remain on the backlog.

A grid with no source data (including while loading) stands its column interactions down: the sort, resize, filter, and reorder affordances drop from the header and the right-click menu defers to the browser's, since each acts on rows that aren't there. The gate reads the source `rows`, not the rendered view — a filter or search that empties the result keeps the header live (the filter button in particular, so the filter can be cleared and the rows recovered). The column-manager toolbar — a deliberate tool, not a header affordance — stays available throughout.

Column order and visibility now resolve on the engine: the controllable `columnOrder` and the column manager's hidden set feed `state.columnOrder` / `state.columnVisibility`, and the rendered column list comes back from the engine's visible leaf columns in pinned-edge order — one source the header, body, and `<colgroup>` all read, replacing the bespoke partition. The dnd reorder still rides @dnd-kit but commits through the same `columnOrder` binding. Row selection is mirrored onto the engine: the controllable `Set<key>` stays the source of truth (the checkboxes write it), and the table reflects it into `state.rowSelection` (`enableRowSelection`) one-way, so the engine's selected-row model tracks the grid — the foundation the cross-page selection and selected-row features build on.

## Migration — converging existing state onto the engine

The state migration is complete: rendering through `flexRender` over a full `ColumnDef`, sorting (`state.sorting` + `enableMultiSort`, with Shift-click and priority badges), filtering, pagination, column sizing, column pinning (`state.columnPinning`), column order/visibility (`state.columnOrder` / `state.columnVisibility`), and row selection (`state.rowSelection`) all live on the one `useReactTable` instance. Per-row inline editing and the virtualized body still layer their own behaviour on top, but read from the same engine. New features build on the engine directly rather than a bespoke hook.

## Feature backlog

### Columns

| Feature | Approach |
|---|---|
| Column groups / multi-level headers | Single-level shipped — a `groups` band over a contiguous run of columns (title, palette color, collapsible, description, icon); `groupedColumnOrder` orders the grid to match the column manager, where groups and their columns are drag-reorderable. Remaining: nested (multi-level) groups via `getHeaderGroups()` depth |
| Fit-to-content sizing | Shipped — columns measure their rendered content and size to it (two-regime allocation: lift the narrowest toward equal when there's room, hold and overflow when there isn't), with header-driven minimums; `width` and controlled `columnSizing` override. Remaining: a per-grid content-cap knob, and re-measuring the off-screen window under virtualization |
| Column header menu | Right-click sort + clear-sort + pin (Pin left / Pin right / Unpin) + auto-size + "Manage columns" shipped via `contextMenu`; fold in filter/hide menu items as they land |

### Filtering

| Feature | Approach |
|---|---|
| Date range filter | A numeric `between` range ships (two-bound editor, open-ended ends); extend the same two-bound editor + operator to `date` columns |
| Faceted counts & ranges | Select-option faceting ships (`getFacetedRowModel` + `getFacetedUniqueValues` populate a `select` filter from the column's data when it sets no `filterOptions`); option counts, text autocomplete, and `getFacetedMinMaxValues` range hints remain |

### Rows

| Feature | Approach |
|---|---|
| Grouping & aggregation | `getGroupedRowModel`, `aggregationFns`, group rows |
| Expandable rows / master-detail | `getExpandedRowModel`, `row.getCanExpand()/toggleExpanded()`, a sub-component renderer |
| Tree data (hierarchical) | `getSubRows` + expansion |
| Row pinning (top/bottom) | `state.rowPinning` |
| Row drag-reorder | Reuse the dnd-kit wiring (already powering column reorder) over the row model |

### Selection & editing

Per-row inline editing is baked into Grid via the `editable` binding (a controllable set of editable row keys plus a commit sink). A row in the set puts all of its editable cells into edit mode at once — each editor inferred from the value's primitive type (string → text `Input`, number → `NumberInput`, boolean → yes/no `Listbox`) or a column's `editCell` slot (select, date, currency, custom). Edits stage live in the grid; removing the row from the set (a save action's check) flushes its changed, valid cells as one `onValueChange` batch, with per-column `validate` dropping a bad cell and Escape reverting one. Editor components are internal — the slot's `onValueUpdate` / `commit` / `cancel` callbacks are the override surface, not exported editors.

| Feature | Approach |
|---|---|
| Cell / range selection (spreadsheet) | A range model — anchored rectangle + ctrl-clicked extras — over the cursor, shared by the read-only and editable grids |
| Fill handle + copy/paste range | Bulk-fill the active range and paste a clipboard TSV block across it, layered on the per-row editing commit path |
| Undo / redo | Value-based history (Ctrl/Cmd+Z · Shift+Z / Y) wrapping the `editable` commit sink |
| Async / optimistic commit | Extend the per-cell commit to await an async `onValueChange` and reflect pending / rejected state in the cell |

### Pagination (extend)

| Feature | Approach |
|---|---|
| Infinite scroll / "load more" | Pair `manualPagination` (cursor or offset) with the existing `@tanstack/react-virtual` window |
| Select-all-across-pages | Selection model aware of total vs. page |

### Data & interop

| Feature | Approach |
|---|---|
| CSV / Excel / print export | Shipped — `exportable`; one item per active type in the header/cell menus and an "Export" toolbar dropdown, over the filtered/sorted row model (scoped to the selection when active); Excel is an HTML-table `.xls`, not a real workbook |
| Clipboard-paste export (structured copy for pasting into a spreadsheet) | A TSV serializer alongside `csv.ts`, written to the clipboard instead of downloaded |

### Rendering & performance

| Feature | Approach |
|---|---|
| Horizontal (column) virtualization | `@tanstack/react-virtual` over columns for very wide grids |
| Variable row heights | Virtualizer `measureElement` dynamic measurement |

### State & accessibility

| Feature | Approach |
|---|---|
| Unified grid-state snapshot (sort + filter + order + visibility + sizing + pagination) save/restore | Generalize the column-manager preset to full table state |
| URL / `searchParams` sync for SSR | Next.js App Router helper mapping table state to the query string |
| Global `aria-rowindex`/`aria-colindex` under pagination | Shipped — pagination emits `role="grid"` with page-aware global indices, alongside virtualization; a plain whole-set grid stays a native table |

---

**See also:** [`index.ts`](index.ts) (public surface) · [`../../docs/MODULES.md`](../../../docs/MODULES.md).
