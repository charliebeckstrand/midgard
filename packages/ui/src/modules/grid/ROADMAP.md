# Grid roadmap

> **Goal: AG-Grid-class power on a TanStack Table engine.** The Grid is migrating from a bespoke, consumer-driven data grid to one backed by [`@tanstack/react-table`](https://tanstack.com/table), so its feature set grows by adopting TanStack's row models rather than hand-rolling each capability. This file tracks the migration and the feature backlog.

## Status

The TanStack Table engine is now in place. `useGridTable` builds a `useReactTable` instance, adapting `GridColumn[]` to `ColumnDef[]` and `getKey` to `getRowId`, and routes row data through the table's row model.

Pagination is the first feature on the engine: server-side (`manualPagination`) and client-side, bound through the controllable `pagination` prop, with a footer carrying a row-range status, page navigation, and an optional page-size picker. The row model is only materialized when pagination is active, so unpaginated grids are unchanged.

Resizable columns are the second: the `resizable` prop wires TanStack's column-sizing API (`enableColumnResizing`, `columnResizeMode`, `column.getSize()`), each data-column header gaining a keyboard-accessible `role="separator"` resize handle, with widths persisted through the controllable `columnSizing` prop.

Filtering is the third: columns gain an optional `value` accessor, then quick search (`search`) and per-column `filterable` inputs (a filter row) both drive TanStack's `getFilteredRowModel` (client) or `manualFiltering` (server).

Sorting is the fourth: data columns are sortable and sorted client-side by default — the engine orders `rows` through `getSortedRowModel` by each column's `value` accessor, or the row field named by the column id when none is given. Opt a column out with `sortable: false` (or grid-wide with `sortable={false}`), and switch to server-side ordering with `sort.manual: true`, where the consumer sorts `rows` (the editable grid keeps sorting opt-in). Single-column today — multi-column with priority is the next step.

Context menus are the fifth: a `contextMenu` config adds a cursor-anchored right-click menu — a column menu on headers (Sort Ascending / Descending, Choose Columns, which opens the column manager) and a cell menu on body cells (Copy). Each side is opt-in and reshapeable through a builder that receives the default items. It composes the `Menu` primitive; column pinning — and a Pin Column item — remain on the backlog.

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
| Precise column sizing | Fixed table layout + `<colgroup>` so resized widths are exact and columns can shrink below content (the shipped resize rides the auto-layout header width) |
| Column pinning (freeze left/right) | `state.columnPinning`, `column.pin()`; sticky offsets from `column.getStart()/getAfter()` |
| Column groups / multi-level headers | Grouped `ColumnDef`s rendered from `getHeaderGroups()` depth |
| Auto-size / fit-to-content | Measure rendered cells, then `setColumnSizing` |
| Column header menu | Right-click sort + "Choose Columns" shipped via `contextMenu`; fold in filter/pin/hide/resize as they land |

### Filtering

| Feature | Approach |
|---|---|
| Richer column-filter types (number range, select, date range, boolean) | Typed filter editors per `filterFn`; text per-column filters and the filter row are shipped |
| Faceted values & counts | `getFacetedRowModel`, `getFacetedUniqueValues`, `getFacetedMinMaxValues` — drives autocomplete/range filter options |
| Filter operators (contains, equals, gt/lt, between) | Custom `filterFns` per column |

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
