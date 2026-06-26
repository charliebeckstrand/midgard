# Grid roadmap

> **Goal: AG-Grid-class power on a TanStack Table engine.** The Grid is migrating from a bespoke, consumer-driven data grid to one backed by [`@tanstack/react-table`](https://tanstack.com/table), so its feature set grows by adopting TanStack's row models rather than hand-rolling each capability. This file tracks the migration and the feature backlog.

## Status

The TanStack Table engine is now in place. `useGridTable` builds a `useReactTable` instance, adapting `GridColumn[]` to `ColumnDef[]` and `getKey` to `getRowId`, and routes row data through the table's row model.

Pagination is the first feature on the engine: server-side (`manualPagination`) and client-side, bound through the controllable `pagination` prop, with a footer carrying a row-range status, page navigation, and an optional page-size picker. The row model is only materialized when pagination is active, so unpaginated grids are unchanged.

Resizable columns are the second: the `resizable` prop wires TanStack's column-sizing API (`enableColumnResizing`, `columnResizeMode`, `column.getSize()`), each data-column header gaining a keyboard-accessible `role="separator"` resize handle, with widths persisted through the controllable `columnSizing` prop. Under `resizable` the table switches to fixed layout with a `<colgroup>` of exact widths and a table width summing them, so resizing one column changes only that column (and the table's total width) — siblings hold their size and the table scrolls — rather than redistributing across the row.

Filtering is the third: columns gain an optional `value` accessor, then quick search (`search`) and per-column filters both drive TanStack's `getFilteredRowModel` (client) or `manualFiltering` (server). A `filterable` column shows a Filter button in its header opening a right-side Sheet with a single-column query builder (from [`modules/query`](../query)) — operator + value rules joined by AND/OR, typed per the column's `filterType` (`text` / `number` / `select` / `date` / `boolean`, the last two rendering a date picker and an is-true/is-false toggle) — applied to rows by the query evaluator. Edits stay in a draft until the sheet's **Apply** settles them onto the engine; Cancel, Escape, or a backdrop press discards the draft, so the applied filter stands. Operator and date-picker menus inside the sheet layer above its backdrop (the modal overlay hosts nested floating surfaces). A `number` column also offers a two-bound `between` range, either end optionally left open. The button reads active only when a rule actually constrains rows (a non-empty value, a one-sided range, or a value-less operator like "is empty"), not merely because a rule exists; a rule the builder reads as inactive imposes no constraint on rows either, so clearing a value (or applying an all-blank query) restores the hidden rows rather than hiding them all.

Sorting is the fourth: data columns are sortable and sorted client-side by default — the engine orders `rows` through `getSortedRowModel` by each column's `value` accessor, or the row field named by the column id when none is given. The default comparator is smart: it reads numbers, comma-grouped numbers, currency, percentages, accounting negatives, dates, and booleans by value, and falls back to a natural, locale-aware string compare (so `Item 2` precedes `Item 10`) — the cases a lexical sort mangles. A column's `sortFn` (rows in, ascending order out) overrides it with a manual client-side comparator. A header click cycles the column tri-state, ascending → descending → unsorted. Opt a column out with `sortable: false` (or grid-wide with `sortable={false}`), and switch to server-side ordering with `sort.manual: true`, where the consumer sorts `rows` (the editable grid keeps sorting opt-in). Single-column today — multi-column with priority is the next step.

Context menus are the fifth, and on by default (`contextMenu={false}` opts out): a cursor-anchored right-click menu — a column menu on headers (Sort Ascending / Descending, Clear sort once the column is sorted, Auto-size columns when resizing is on, Choose Columns, which opens the column manager) and a cell menu on body cells (Copy). Holding Ctrl during the right-click defers to the browser's standard menu. Each side reshapes through a builder that receives the default items. It composes the `Menu` primitive; column pinning — and a Pin Column item — remain on the backlog.

Auto-sizing is the sixth: under `resizable`, data columns fit the container width on mount and on container resize (via `ResizeObserver`), distributing the available width across data columns within each column's bounds and standing down once the user drag-resizes a column (so manual widths persist). The header's "Auto-size columns" action re-fits on demand and re-arms the automatic behavior. Width-distribution only; content measurement (fit-to-content) is still on the backlog.

Truncation is the seventh, and on by default (`truncate={false}` opts out, as the editable variant does): overflowing cell content — and column titles — clip to one line with an ellipsis instead of spilling across neighbours, visible wherever the column width is bounded (a resizable/fixed-layout grid). A truncated cell reveals its full content in a hover/focus `Tooltip`; a column's `cellTooltip` returns a node to supersede that content or `null` to disable it. A truncated header title reveals itself the same way, the title shrinking within the header's flex slot — and, when sortable, within the sort button — so the ellipsis engages around the sort/filter/resize chrome rather than the title overrunning the cell. Both surfaces share one overflow detector (`useGridTruncation`), measured eagerly at sub-pixel precision (a `Tooltip` can't open mid-hover on an `enabled` flip), and mount a tooltip only while truncated. The tooltip's floating surface mounts its portal only while open (see `FloatingSurface`), so a grid of many cells leaves no `[data-floating-ui-portal]` nodes behind at rest — the styled reveal without a per-cell portal flood. Truncation needs a bounded column width: a `resizable`/fixed-layout grid, or a column `width`; an auto-layout column sizes to its content instead.

A grid with no source data (including while loading) stands its column interactions down: the sort, resize, filter, and reorder affordances drop from the header and the right-click menu defers to the browser's, since each acts on rows that aren't there. The gate reads the source `rows`, not the rendered view — a filter or search that empties the result keeps the header live (the filter button in particular, so the filter can be cleared and the rows recovered). The column-manager toolbar — a deliberate tool, not a header affordance — stays available throughout.

Everything else — selection, column order/visibility, drag-reorder, virtualization, the editable variant — still runs on the original bespoke hooks. The migration below converges them onto the one instance.

## Migration — converging existing state onto the engine

Each step preserves the public API via adapters and ships as its own change, smallest blast radius first; the render-tree step (1) unblocks the cleanest implementation of the feature backlog and so leads.

| # | Step | TanStack surface |
|---|---|---|
| 1 | Render head/cells through `flexRender`; map `GridColumn` to full `ColumnDef` (accessors, `header`, `cell`) | `getHeaderGroups()`, `row.getVisibleCells()`, `flexRender` |
| 2 | Multi-column sort with priority badges (single-column client sort shipped) | `state.sorting`, `enableMultiSort`, `sortingFns`, header sort-index UI |
| 3 | Move row selection onto the engine | `state.rowSelection`, `enableRowSelection` |
| 4 | Move column order/visibility (fold in the column manager + dnd reorder) | `state.columnOrder`, `state.columnVisibility` |

## Feature backlog

### Columns

| Feature | Approach |
|---|---|
| Column pinning (freeze left/right) | `state.columnPinning`, `column.pin()`; sticky offsets from `column.getStart()/getAfter()` |
| Column groups / multi-level headers | Grouped `ColumnDef`s rendered from `getHeaderGroups()` depth |
| Fit-to-content sizing | Auto-fit-to-width shipped (distributes container width via `setColumnSizing`); fit-to-content still needs rendered-cell measurement |
| Column header menu | Right-click sort + clear-sort + auto-size + "Choose Columns" shipped via `contextMenu`; fold in filter/pin/hide as they land |

### Filtering

| Feature | Approach |
|---|---|
| Date range filter | A numeric `between` range ships (two-bound editor, open-ended ends); extend the same two-bound editor + operator to `date` columns |
| Faceted values & counts | `getFacetedRowModel`, `getFacetedUniqueValues`, `getFacetedMinMaxValues` — drives autocomplete/range filter options |

### Rows

| Feature | Approach |
|---|---|
| Grouping & aggregation | `getGroupedRowModel`, `aggregationFns`, group rows |
| Expandable rows / master-detail | `getExpandedRowModel`, `row.getCanExpand()/toggleExpanded()`, a sub-component renderer |
| Tree data (hierarchical) | `getSubRows` + expansion |
| Row pinning (top/bottom) | `state.rowPinning` |
| Row drag-reorder | Reuse the dnd-kit wiring (already powering column reorder) over the row model |

### Selection & editing

| Feature | Approach |
|---|---|
| Cell / range selection (spreadsheet) | Extend the editable variant's range model to the read-only grid |
| More cell editors (select, date, checkbox, autocomplete) | Build on `GridEditable`'s editor contract |
| Validation, async commit, undo/redo | Extend the editable draft/commit pipeline |
| Fill handle + copy/paste range | Clipboard TSV over the active range |

### Pagination (extend)

| Feature | Approach |
|---|---|
| Infinite scroll / "load more" | Pair `manualPagination` (cursor or offset) with the existing `@tanstack/react-virtual` window |
| Jump-to-page input | Composes the footer's existing controls |
| Select-all-across-pages | Selection model aware of total vs. page |

### Data & interop

| Feature | Approach |
|---|---|
| CSV / Excel export, clipboard, print view | Derive from the (filtered/sorted) row model |

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
| Global `aria-rowindex`/`aria-colindex` under pagination | Emit grid semantics with page-aware global indices (today only virtualization emits them) |

---

**See also:** [`index.ts`](index.ts) (public surface) · [`../../docs/MODULES.md`](../../../docs/MODULES.md).
