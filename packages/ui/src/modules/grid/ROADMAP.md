# Grid roadmap

> **Goal: AG-Grid-class power on a TanStack Table engine.** The Grid is migrating from a bespoke, consumer-driven data grid to one backed by [`@tanstack/react-table`](https://tanstack.com/table), so its feature set grows by adopting TanStack's row models rather than hand-rolling each capability. This file tracks the migration and the feature backlog.

## Status

The TanStack Table engine is now in place. `useGridTable` builds a `useReactTable` instance, adapting `GridColumn[]` to `ColumnDef[]` and `getKey` to `getRowId`, and routes row data through the table's row model.

Pagination is the first feature on the engine: server-side (`manualPagination`) and client-side, bound through the controllable `pagination` prop, with a footer carrying a row-range status, page navigation, an optional page-size picker, and an optional "Go to page" jump input (`pagination.jumpToPage`, shown for a known multi-page set and clamped to range). The row model is only materialized when pagination is active, so unpaginated grids are unchanged.

Resizable columns are the second: the `resizable` prop wires TanStack's column-sizing API (`enableColumnResizing`, `columnResizeMode`, `column.getSize()`), each data-column header gaining a keyboard-accessible `role="separator"` resize handle, with widths persisted through the controllable `columnSizing` prop. Under `resizable` the table switches to fixed layout with a `<colgroup>` of exact widths and a table width summing them, so resizing one column changes only that column (and the table's total width) — siblings hold their size and the table scrolls — rather than redistributing across the row.

Filtering is the third: columns gain an optional `value` accessor, then quick search (`search`) and per-column filters both drive TanStack's `getFilteredRowModel` (client) or `manualFiltering` (server). A `filterable` column shows a Filter button in its header opening a right-side Sheet with a single-column query builder (from [`modules/query`](../query)) — operator + value rules joined by AND/OR, typed per the column's `filterType` (`text` / `number` / `select` / `date` / `boolean`, the last two rendering a date picker and an is-true/is-false toggle) — applied to rows by the query evaluator. Edits stay in a draft until the sheet's **Apply** settles them onto the engine; Cancel, Escape, or a backdrop press discards the draft, so the applied filter stands. A **Reset** button, left-aligned across from the Cancel / Apply pair, lifts the applied filter outright (and closes), offered only while a filter is in effect. Operator and date-picker menus inside the sheet layer above its backdrop (the modal overlay hosts nested floating surfaces). A `number` column also offers a two-bound `between` range, either end optionally left open. A `select` column with no `filterOptions` offers the column's own values instead, faceted from the data (`getFacetedUniqueValues` over the rows other filters leave, sorted and de-duplicated). The button reads active only when a rule actually constrains rows (a non-empty value, a one-sided range, or a value-less operator like "is empty"), not merely because a rule exists; a rule the builder reads as inactive imposes no constraint on rows either, so clearing a value (or applying an all-blank query) restores the hidden rows rather than hiding them all.

Sorting is the fourth: data columns are sortable and sorted client-side by default — the engine orders `rows` through `getSortedRowModel` by each column's `value` accessor, or the row field named by the column id when none is given. The default comparator is smart: it reads numbers, comma-grouped numbers, currency, percentages, accounting negatives, dates, and booleans by value, and falls back to a natural, locale-aware string compare (so `Item 2` precedes `Item 10`) — the cases a lexical sort mangles. A column's `sortFn` (rows in, ascending order out) overrides it with a manual client-side comparator. A plain header click cycles the column tri-state, ascending → descending → unsorted, collapsing the sort to that one column; a Shift-click folds the column into the existing sort instead — appending it ascending, flipping it to descending, then dropping it — leaving the other columns and their priority order in place. The sort binding is an ordered list (`SortState[]`, highest priority first; the empty list is unsorted), the engine orders by all of it (`enableMultiSort`), and each sorted header carries a 1-based priority badge once more than one column sorts. The header right-click menu's Sort ascending / descending set a single-column sort (Clear sort empties it); multi-column is the Shift-click path. Opt a column out with `sortable: false` (or grid-wide with `sortable={false}`), and switch to server-side ordering with `sort.manual: true`, where the consumer sorts `rows` by the same list (the editable grid keeps sorting opt-in).

Context menus are the fifth, and on by default (`contextMenu={false}` opts out): a cursor-anchored right-click menu — a column menu on headers (Sort ascending / descending, Clear sort once the column is sorted, Auto-size columns when resizing is on, Manage columns, which opens the column manager) and a cell menu on body cells (Copy). The column menu also carries the pin controls (Pin left / Pin right / Unpin). Holding Ctrl during the right-click defers to the browser's standard menu. Each side reshapes through a builder that receives the default items. It composes the `Menu` primitive.

Auto-sizing is the sixth: under `resizable`, data columns fit the container width on mount and on container resize (via `ResizeObserver`), distributing the available width across data columns within each column's bounds and standing down once the user drag-resizes a column (so manual widths persist). The header's "Auto-size columns" action re-fits on demand and re-arms the automatic behavior. Width-distribution only; content measurement (fit-to-content) is still on the backlog.

Truncation is the seventh, and on by default (`truncate={false}` opts out, as the editable variant does): overflowing cell content — and column titles — clip to one line with an ellipsis instead of spilling across neighbours, visible wherever the column width is bounded (a resizable/fixed-layout grid). A truncated cell reveals its full content in a hover/focus `Tooltip`; a column's `cellTooltip` returns a node to supersede that content or `null` to disable it. A truncated header title reveals itself the same way, the title shrinking within the header's flex slot — and, when sortable, within the sort button — so the ellipsis engages around the sort/filter/resize chrome rather than the title overrunning the cell. Both surfaces share one overflow detector (`useGridTruncation`), measured eagerly at sub-pixel precision (a `Tooltip` can't open mid-hover on an `enabled` flip), and mount a tooltip only while truncated. The tooltip's floating surface mounts its portal only while open (see `FloatingSurface`), so a grid of many cells leaves no `[data-floating-ui-portal]` nodes behind at rest — the styled reveal without a per-cell portal flood. Truncation needs a bounded column width: a `resizable`/fixed-layout grid, or a column `width`; an auto-layout column sizes to its content instead.

CSV export is the eighth, opt-in via `exportable`: an "Export to CSV" item joins the header right-click menu and downloads the grid's filtered and sorted rows (all pages, from the engine's sorted row model) as an RFC 4180 file, UTF-8 BOM led for spreadsheet apps. Each cell reads its column's `value` accessor — the same value sort and filter use — falling back to the row field named by the column id; non-data columns (selection, actions) and columns with neither a `value` nor a matching field drop out or blank. A `column`-menu builder can reach the same action through its context's `exportCsv`. Excel and print views remain on the backlog.

Column pinning is the ninth, declared per column via `pinned` (`'left'` / `'right'`, or `true` for left): the engine's `columnPinning` state freezes the column against horizontal scroll, sticking it to that edge at an offset summed from the engine (`column.getStart('left')` / `getAfter('right')`), over an opaque surface so the scrolling columns pass beneath it, with a separating shadow at each frozen group's inner boundary. Columns are stable-partitioned to their edge in display order (left-pinned first, the scrolling columns between, right-pinned last) so the header, body cells, and `<colgroup>` share one order while the sticky offsets stack from the edge inward. A pinned column is locked — dropped from drag-reorder and the column manager's hide list, shown in its pinned group. Stacking several columns on a side needs known widths (a `resizable`/fixed-layout grid, or a column `width`) so the offsets can sum; a lone pinned column on a side needs neither. The frozen header layers above the sticky header so the top corner stays on top, and below it on a vertical scroll so pinned cells tuck under the head. `pinned` is the column's initial pin; the header context menu's Pin left / Pin right / Unpin items override it at runtime (an override map layered over the static flags), so a column can be frozen or released without touching the definitions.

A grid with no source data (including while loading) stands its column interactions down: the sort, resize, filter, and reorder affordances drop from the header and the right-click menu defers to the browser's, since each acts on rows that aren't there. The gate reads the source `rows`, not the rendered view — a filter or search that empties the result keeps the header live (the filter button in particular, so the filter can be cleared and the rows recovered). The column-manager toolbar — a deliberate tool, not a header affordance — stays available throughout.

Column order and visibility now resolve on the engine: the controllable `columnOrder` and the column manager's hidden set feed `state.columnOrder` / `state.columnVisibility`, and the rendered column list comes back from the engine's visible leaf columns in pinned-edge order — one source the header, body, and `<colgroup>` all read, replacing the bespoke partition. The dnd reorder still rides @dnd-kit but commits through the same `columnOrder` binding. Row selection is mirrored onto the engine: the controllable `Set<key>` stays the source of truth (the checkboxes write it), and the table reflects it into `state.rowSelection` (`enableRowSelection`) one-way, so the engine's selected-row model tracks the grid — the foundation the cross-page selection and selected-row features build on.

## Migration — converging existing state onto the engine

The state migration is complete: rendering through `flexRender` over a full `ColumnDef`, sorting (`state.sorting` + `enableMultiSort`, with Shift-click and priority badges), filtering, pagination, column sizing, column pinning (`state.columnPinning`), column order/visibility (`state.columnOrder` / `state.columnVisibility`), and row selection (`state.rowSelection`) all live on the one `useReactTable` instance. The editable variant and the virtualized body still layer their own behaviour on top, but read from the same engine. New features build on the engine directly rather than a bespoke hook.

## Feature backlog

### Columns

| Feature | Approach |
|---|---|
| Column groups / multi-level headers | Grouped `ColumnDef`s rendered from `getHeaderGroups()` depth |
| Fit-to-content sizing | Auto-fit-to-width shipped (distributes container width via `setColumnSizing`); fit-to-content still needs rendered-cell measurement |
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

| Feature | Approach |
|---|---|
| Cell / range selection (spreadsheet) | Extend the editable variant's range model to the read-only grid |
| More cell editors (autocomplete) | Select, date, and boolean editors ship (`GridEditableSelectEditor` / `GridEditableDateEditor` / `GridEditableBooleanEditor`); autocomplete still builds on the editor contract |
| Async / optimistic commit | Per-cell `validate` (rejects a bad commit, editor stays open with the message) and value-based undo/redo (Ctrl/Cmd+Z · Shift+Z / Y, exposed via `useGridEditable`) ship; async/optimistic commit still extends the draft pipeline |
| Fill handle + copy/paste range | Clipboard TSV over the active range |

### Pagination (extend)

| Feature | Approach |
|---|---|
| Infinite scroll / "load more" | Pair `manualPagination` (cursor or offset) with the existing `@tanstack/react-virtual` window |
| Select-all-across-pages | Selection model aware of total vs. page |

### Data & interop

| Feature | Approach |
|---|---|
| Excel export, clipboard, print view | CSV export ships (`exportable`, header-menu item over the filtered/sorted row model); Excel/print still derive from that model |

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
