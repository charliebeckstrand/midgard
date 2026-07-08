import type { ReactNode } from 'react'
import type { TableElementProps, TableVariants } from '../../components/table'
import type { DensityLevel } from '../../providers/density'
import type { SortState } from './context'
import type { GridExportEntry } from './export/types'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumnGroups } from './grid-group-types'
import type { GridCellClick, GridRowClick } from './grid-row'
import type { GridRowGroups } from './grid-row-group-types'
import type {
	GridColumn,
	GridColumnFilters,
	GridColumnManagerPreset,
	GridColumnSizing,
	GridContextMenu as GridContextMenuConfig,
	GridPagination,
	GridSearch,
} from './types'

/**
 * Row-virtualization setting: `true` for defaults, `false`/absent to disable,
 * or an object tuning `estimateSize` (row height, px) and `overscan`.
 *
 * @see {@link GridProps.virtualize}
 */
export type GridVirtualize = boolean | { estimateSize?: number; overscan?: number }

/**
 * Infinite-scroll binding for {@link GridProps.infiniteScroll}: as the
 * virtualized window nears the end of the loaded rows, the grid calls
 * `onLoadMore` so the consumer can grow `rows` with the next batch. Layers on
 * {@link GridProps.virtualize} (which supplies the windowed scroll container),
 * and replaces the paged {@link GridProps.pagination} footer — the two are
 * mutually exclusive.
 *
 * @remarks One binding, two data sources. A *local* set appends synchronously
 * (leave `loadingMore` unset and gate on `hasMore`); a *server* set fetches the
 * next page and appends it — hold `loadingMore` true while the request is in
 * flight so the grid shows a trailing skeleton row and holds off re-requesting.
 * In both, `hasMore` is the master gate: once `false`, `onLoadMore` never fires
 * again and the indicator drops. While more rows may remain, the grid reports an
 * indeterminate `aria-rowcount` rather than advertising the loaded count as the
 * whole set, and its busy status announces each grown total as a batch settles.
 *
 * Seed the first page as `rows` — an empty `rows` shows the `empty` slot rather
 * than auto-fetching (use {@link GridProps.loading} for the initial load); the
 * grid grows the set from there as the scroll advances.
 *
 * @see {@link GridProps.infiniteScroll}
 */
export type GridInfiniteScroll = {
	/**
	 * Called when the scroll reaches within {@link GridInfiniteScroll.threshold}
	 * rows of the loaded end and more rows remain, once per newly-loaded extent.
	 * Append the next rows to your `rows` — a local slice, or a server fetch.
	 */
	onLoadMore: () => void
	/**
	 * Whether more rows remain beyond the loaded set. Once `false`, the grid stops
	 * calling `onLoadMore` and drops the trailing indicator.
	 * @defaultValue true
	 */
	hasMore?: boolean
	/**
	 * Whether a load is in flight. Suppresses re-requesting while the current
	 * batch resolves and shows a trailing skeleton row; leave unset for a
	 * synchronous local source, which appends without a pending state.
	 * @defaultValue false
	 */
	loadingMore?: boolean
	/**
	 * How many rows from the end of the loaded set the scroll may come within
	 * before `onLoadMore` fires, so the next batch is requested ahead of the
	 * viewport reaching the last row.
	 * @defaultValue The grid's virtualization `overscan`.
	 */
	threshold?: number
	/**
	 * Content for the trailing row shown while `loadingMore`, superseding the
	 * default per-column skeleton cells — e.g. a run of skeleton rows. Rendered
	 * in a single cell spanning every column.
	 */
	loadingIndicator?: ReactNode
}

/**
 * Controlled/uncontrolled sort binding for {@link GridProps.sort}: an ordered
 * list of sorted columns, highest priority first. A single sort is a one-item
 * list; the empty list is unsorted. A header Shift-click sorts by several
 * columns at once (see {@link GridContextValue.toggleSort}).
 */
export type GridSort = {
	value?: SortState[]
	defaultValue?: SortState[]
	onValueChange?: (sort: SortState[]) => void
	/**
	 * Server-side (manual) sorting: the consumer sorts `rows` and the grid leaves
	 * their order untouched. When omitted, the grid sorts client-side by each
	 * sortable column's value — its {@link GridColumn.value} accessor, or the row
	 * field named by the column id when none is given.
	 * @defaultValue false
	 */
	manual?: boolean
}

/**
 * Context for a {@link GridGroupBy.renderHeader} override: the grouped column's
 * id, the group's shared value, and the number of rows it holds.
 */
export type GridGroupHeaderContext = {
	/** The column id the rows are grouped by. */
	columnId: string | number
	/** The value shared by every row in this group (the grouped column's cell value). */
	value: unknown
	/** How many rows the group holds. */
	count: number
}

/**
 * What a manual-mode {@link GridGroupBy.groupRow} resolver returns to mark a row
 * as a group header: the group's stable `key` (the identity the expanded set and
 * {@link GridGroupBy.onGroupExpand} speak), the grouped column's shared `value`
 * (the default header label), and the group's child `count` — supplied by the
 * backend, since the grid may hold none of the children.
 */
export type GridGroupHeaderRow = {
	/** Stable group identity; keys the expanded set and the lazy-load callback. */
	key: string | number
	/** The grouped column's value shared by the group's children; the default label. */
	value: unknown
	/** Child-row count from the backend, shown in the default `value (count)` label. */
	count: number
}

/**
 * Controlled/uncontrolled row-grouping binding for {@link GridProps.groupBy}:
 * the id of the single column the rows are grouped by (or `null` for no
 * grouping). Grouping collects rows sharing that column's value under an
 * expandable group-header row that shows the value and a row count, backed by
 * the engine's grouped/expanded row models.
 *
 * @remarks Two modes, selected by {@link GridGroupBy.manual} — the same split
 * as the pagination/sort/filter bindings. In client mode (the default) the
 * engine computes the groups from the in-memory `rows`. In manual (server)
 * mode the grid computes nothing: the consumer's backend groups, and `rows` is
 * fed back as the rendered sequence — group-header rows (marked by
 * {@link GridGroupBy.groupRow}) each followed by their child rows. Either way
 * grouping renders its own body, so it takes precedence over — and stands
 * down — {@link GridProps.virtualize} and the {@link GridProps.navigable}
 * cursor while active; sorting, filtering, search, selection, resizing, and
 * pinning still apply. Client grouping also stands
 * {@link GridProps.pagination} down; manual grouping composes with *manual*
 * pagination (the backend pages the grouped sequence) and forces the sort /
 * search / column-filter bindings to their manual mode, since a client
 * transform would tear child rows from their group headers.
 *
 * @typeParam T - Shape of a single row; defaulted for the client mode, which
 * never reads the rows through this binding.
 */
export type GridGroupBy<T = unknown> = {
	/** The grouped column id, or `null` for no grouping. Pairs with {@link GridGroupBy.onValueChange}. */
	value?: string | number | null
	/** Initial grouped column id for the uncontrolled case. @defaultValue null */
	defaultValue?: string | number | null
	/** Fires with the next grouped column id (or `null` when grouping is cleared) — a {@link GridGroupBy.panel} edit, or a controlled write. */
	onValueChange?: (columnId: string | number | null) => void
	/**
	 * Whether groups start expanded (rows visible) or collapsed (just the group
	 * headers). Each group's header toggles it thereafter. Under
	 * {@link GridGroupBy.manual} a boolean can't enumerate the (server-known)
	 * groups, so pass a `Set` of group keys to seed the uncontrolled expanded
	 * state instead; a manual grid otherwise starts fully collapsed.
	 * @defaultValue true
	 */
	defaultExpanded?: boolean | Set<string | number>
	/**
	 * Renders a group header's label, superseding the default `value (count)`.
	 * Receives the {@link GridGroupHeaderContext}; the expand toggle and count
	 * chrome around it stay. Serves both modes — under {@link GridGroupBy.manual}
	 * the context reads from the row's {@link GridGroupBy.groupRow} descriptor.
	 */
	renderHeader?: (context: GridGroupHeaderContext) => ReactNode
	/**
	 * Server-side (manual) grouping: the backend groups, and the consumer
	 * supplies `rows` as the rendered sequence — group-header rows (marked by
	 * {@link GridGroupBy.groupRow}, carrying the backend's counts and
	 * aggregates) interleaved with the child rows of expanded groups. The grid
	 * associates children positionally: a leaf row belongs to the nearest group
	 * header above it, indents under its rail, and collapses with it. Expansion
	 * is a controllable set of group keys ({@link GridGroupBy.expanded} /
	 * {@link GridGroupBy.onExpandedChange}); expanding fires
	 * {@link GridGroupBy.onGroupExpand} so the consumer can lazily fetch that
	 * group's children and feed them back in `rows`. Every row — header and
	 * leaf alike — still needs a stable, unique {@link GridDataProps.getKey}.
	 * Single-level, like client grouping; the aggregate total rows
	 * ({@link GridDataProps.groupTotalRow} / {@link GridDataProps.grandTotalRow})
	 * stand down, since the backend owns the figures.
	 * @defaultValue false
	 */
	manual?: boolean
	/**
	 * Manual-mode row contract: marks a row as a group header by returning its
	 * {@link GridGroupHeaderRow} descriptor, or `null` for a leaf row. Required
	 * for {@link GridGroupBy.manual} grouping to render — without it every row
	 * renders flat.
	 */
	groupRow?: (row: T) => GridGroupHeaderRow | null
	/**
	 * Controlled set of expanded group keys under {@link GridGroupBy.manual};
	 * pair with {@link GridGroupBy.onExpandedChange}. Client mode keeps its own
	 * engine expansion and ignores this.
	 */
	expanded?: Set<string | number>
	/**
	 * Fires with the next expanded key set when a manual group header toggles.
	 * Coalesced to a concrete set, never `undefined` — matching the other grid
	 * bindings.
	 */
	onExpandedChange?: (expanded: Set<string | number>) => void
	/**
	 * Fires with a group's key when its collapsed header expands — the manual
	 * mode's lazy-load hook: fetch that group's children and append them to
	 * `rows` after its header. Not fired on collapse, nor by client grouping.
	 *
	 * @remarks The group opens the instant its header is toggled (expansion is
	 * controlled state, not gated on the fetch). Until the children land the grid
	 * fills the opened group with placeholder skeleton rows — a group whose
	 * backend `count` is positive but whose children aren't present yet — so the
	 * expand reads as immediate rather than waiting on the request. A group the
	 * backend reports empty (`count` of 0) shows nothing.
	 */
	onGroupExpand?: (key: string | number) => void
	/**
	 * Renders the group panel above the table: drag a
	 * {@link GridColumn.groupable} column in (or press the "group rows by"
	 * affordance its header gains) to group by it, and remove the active chip
	 * to ungroup — each emitting through {@link GridGroupBy.onValueChange}.
	 * Works in both modes; single-level, so the panel holds one column and a
	 * second drop replaces it.
	 * @defaultValue false
	 */
	panel?: boolean
	/**
	 * Per-group presentation overlay the row manager edits — a palette color and a
	 * manual leaf order keyed by each group's value (see {@link GridRowGroup}). The
	 * plain-array shorthand seeds it uncontrolled; the `{ value, onValueChange }`
	 * form persists it. Client grouping only — under {@link GridGroupBy.manual} the
	 * backend owns the sequence and the overlay stands down.
	 */
	rowGroups?: GridRowGroups
	/**
	 * The row manager — a "Manage rows" dialog reached from the group-header
	 * right-click menu, where each group takes a color and reorders, and its rows
	 * reorder within it (committed through {@link GridGroupBy.rowGroups}). On by
	 * default whenever client grouping and the header context menu are both live;
	 * `false` is the off switch — no "Manage rows" item, no dialog.
	 * @defaultValue true
	 */
	rowManager?: boolean
}

/**
 * Row expansion / master-detail binding for {@link GridProps.expandable}: a
 * controllable set of expanded row keys plus the detail renderer. An expanded
 * row reveals a full-width panel beneath it holding `render(row)` — an
 * arbitrary React sub-component — over an auto-height CSS transition. Add an
 * {@link GridColumn.expander} column for the disclosure chevron.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExpandable<T> = {
	/** Controlled set of expanded row keys; pair with {@link GridExpandable.onValueChange}. */
	value?: Set<string | number>
	/** Initial expanded keys for the uncontrolled case. @defaultValue an empty set */
	defaultValue?: Set<string | number>
	/**
	 * Fires with the next expanded set. Coalesced to a concrete set, never
	 * `undefined` — matching the other grid bindings.
	 */
	onValueChange?: (expanded: Set<string | number>) => void
	/** Renders the detail panel for an expanded row; the panel spans the full row width. */
	render: (row: T) => ReactNode
	/**
	 * Whether a row can expand at all. A row this rejects shows no chevron and
	 * never opens — for rows with nothing to detail.
	 * @defaultValue every row expandable
	 */
	rowExpandable?: (row: T) => boolean
}

/**
 * Row drag-reorder binding for {@link GridProps.rowReorder}. The consumer owns
 * the `rows` source, so the grid reports the reordered rows through `onReorder`
 * rather than mutating them — apply the new order to your state (or persist it)
 * to make it stick.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridRowReorder<T> = {
	/**
	 * Fires when a drag settles the rows into a new order, with the full row set
	 * in that order (the same shape {@link List}'s `onReorder` takes). Reassign it
	 * to your `rows` to commit the move.
	 */
	onReorder: (rows: T[]) => void
	/**
	 * Turns the drag handles off without dropping the handle column, e.g. while a
	 * mutation is in flight. The grid also stands reordering down on its own
	 * whenever a manual order wouldn't be meaningful — an active column sort,
	 * pagination, virtualization, an empty/loading grid, or a filtered view.
	 * @defaultValue false
	 */
	disabled?: boolean
}

/**
 * Controlled/uncontrolled column-order binding for
 * {@link GridProps.columnOrder}: the column ids in display order. Drives
 * both the column-manager dialog and the `reorder` header drag handles, so the
 * two stay in lockstep over one source of truth.
 */
export type GridColumnOrder = {
	value?: (string | number)[]
	defaultValue?: (string | number)[]
	onValueChange?: (order: (string | number)[]) => void
}

/**
 * Controlled/uncontrolled row-selection binding for {@link GridProps.selection},
 * plus an optional batch-action bar shown while any row is selected.
 */
export type GridSelection = {
	value?: Set<string | number>
	defaultValue?: Set<string | number>
	/**
	 * Fires with the next selection. The grid coalesces an internal clear to an
	 * empty set, so the payload is never `undefined` — matching the other grid
	 * bindings' non-nullable callbacks.
	 */
	onValueChange?: (selection: Set<string | number>) => void
	/**
	 * Renders a {@link Toolbar} of actions over the table while at least one row
	 * is selected. Receives the current selection and a setter to mutate it.
	 */
	batchActions?: (params: {
		selection: Set<string | number>
		setSelection: (next: Set<string | number>) => void
	}) => ReactNode
}

/**
 * Column-manager binding for {@link GridProps.columnManager}: gates column
 * management, optionally adds a toolbar button, and holds
 * controlled/uncontrolled column-visibility state. Column order lives on the
 * top-level {@link GridProps.columnOrder} binding, which the manager dialog
 * reads and writes.
 */
export type GridColumnManagerConfig = {
	/**
	 * Whether column management is available: the "Manage columns" header
	 * context-menu item and the manager dialog it opens. Set `false` to drop the
	 * item and keep the dialog out of the tree entirely.
	 * @defaultValue true
	 */
	enabled?: boolean
	/**
	 * Also render a button in the grid's toolbar that opens the manager dialog,
	 * alongside the context-menu item. Has no effect when `enabled` is `false`.
	 * @defaultValue false
	 */
	toolbarButton?: boolean
	/**
	 * Label on the toolbar button and the dialog title.
	 * @defaultValue 'Manage columns'
	 */
	label?: ReactNode

	/** Controlled set of hidden column ids; pair with {@link GridColumnManagerConfig.onHiddenChange}. */
	hidden?: Set<string | number>

	/** Initial hidden column ids for the uncontrolled case. */
	defaultHidden?: Set<string | number>

	/**
	 * Fires with the next hidden set. Named `onHiddenChange` rather than the usual
	 * `onValueChange` because this config also carries the `open`/`onOpenChange`
	 * controllable, so each binding names its own field.
	 */
	onHiddenChange?: (hidden: Set<string | number>) => void

	/** Controlled open state of the manager dialog; pair with {@link GridColumnManagerConfig.onOpenChange}. */
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void

	/** Called when the manager's "save preset" action fires, with the current order and hidden ids. */
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Header configuration for {@link GridDataProps.header}. Carries the header
 * row's positioning today; further header options attach here as the surface
 * grows, so the grid takes one `header` binding rather than a prop per setting.
 */
export type GridHeader = {
	/**
	 * Header row positioning. `'sticky'` pins the header to the top while the body
	 * scrolls, forcing a scroll wrapper around the table; `'static'` leaves it in
	 * normal flow.
	 * @defaultValue 'static'
	 */
	position?: 'static' | 'sticky'
}

/**
 * Live row counts handed to the {@link GridFooter} settings: the filtered
 * extent, the source total, and the current selection size. Computed at render
 * so they track client-side search and filtering.
 */
export type GridFooterStats = {
	/**
	 * Rows after search/filter — the full filtered extent across every page, not
	 * just the rendered window. The server total under server-side pagination.
	 */
	rows: number
	/**
	 * Source row count before any client-side search/filter. Equal to
	 * {@link GridFooterStats.rows} when nothing narrows the set (and under
	 * server-side filtering, where the pre-filter total isn't known to the grid).
	 */
	total: number
	/** Currently selected row count; `0` without a selection column. */
	selected: number
}

/**
 * Footer configuration for {@link GridDataProps.footer}: an opt-in status bar
 * below the table, each setting rendered only when enabled. Distinct from the
 * {@link GridPagination} footer — a paginated grid can carry both, the pagination
 * navigation beneath this summary bar.
 */
export type GridFooter = {
	/**
	 * Show the total row count: `'47 rows'`, `'12 of 47 rows visible'` while a
	 * client-side search or filter narrows the set, or `'No rows'` when empty.
	 * Counts the full filtered extent across all pages, not just the rendered
	 * window. An active {@link GridFooter.selectedTotal} replaces this count in
	 * place rather than sitting beside it.
	 * @defaultValue false
	 */
	rowTotal?: boolean
	/**
	 * Show the selected-row count nested against the visible extent
	 * (`'3 of 12 rows selected'`) while a selection is active; silent when nothing
	 * is selected. Takes the leading slot from {@link GridFooter.rowTotal} while
	 * active — its `of` denominator keeps the visible context the total would show.
	 * Needs a selection column to be meaningful.
	 * @defaultValue false
	 */
	selectedTotal?: boolean
	/**
	 * Custom content rendered at the footer's trailing edge, receiving the live
	 * {@link GridFooterStats}. Use for a summary line, a column aggregate, or a
	 * footer action; return `null` to render nothing.
	 */
	content?: (stats: GridFooterStats) => ReactNode
}

/**
 * Props for a read-only data {@link Grid}. `T` is the row datum type;
 * `columns` and the various renderers are keyed to it.
 *
 * @typeParam T - Shape of a single row.
 *
 * @internal
 */
export type GridDataProps<T> = Omit<TableVariants, 'density'> & {
	/**
	 * Density level driving cell padding and grid-internal metrics (resize
	 * handles, column autosize measurement, the virtualized row-height
	 * estimate). Unlike the bare `Table` — a static/RSC leaf that reads no
	 * context — an omitted `density` falls back to an enclosing
	 * `DensityProvider`, since Grid is always client-rendered.
	 * @defaultValue 'snug'
	 * @see {@link useDensityLevel} for the explicit-then-ambient resolution.
	 */
	density?: DensityLevel

	/**
	 * Tight, all-dimensions-down preset that steps the grid below what
	 * {@link GridDataProps.density | density} alone reaches. On its own `density`
	 * controls padding only; `condensed` forces the compact padding step
	 * (overriding `density` for every density-derived metric — cell padding,
	 * resize-handle width, the virtualized row-height estimate, autosize
	 * measurement) and additionally:
	 *
	 * - steps header and body cell text below the table's base to `text-sm`;
	 * - steps every icon in a header or body cell — the grid's own chrome (sort
	 *   arrow, pin, grip, filter) and a consumer's `Icon` or `Badge`-slot icon —
	 *   to the compact size, and steps a consumer `Badge`'s text down to match;
	 *   and
	 * - broadcasts a `compact` density cascade over the *table*, so size-aware
	 *   *client* cell content (an inline `Input`, the selection checkbox) shrinks
	 *   with it.
	 *
	 * Scoped to the table: a portaled overlay the grid spawns — a context menu, the
	 * column-manager dialog — stays on the ambient density rather than adopting the
	 * condensed step, so it reads consistently whether opened from a condensed grid
	 * or not. Wrap the grid in a `DensityProvider` to size those overlays.
	 * @defaultValue false
	 */
	condensed?: boolean

	/** Column definitions, in declaration order; `columnOrder`, `reorder`, and the column manager can reorder and hide a subset. */
	columns: GridColumn<T>[]
	rows: T[]
	/** Derives a stable, unique key per row; backs selection, sort, and virtualization identity. */
	getKey: (row: T, index: number) => string | number

	sort?: GridSort

	/**
	 * Whether data columns are sortable by default. Each column overrides this
	 * through its own {@link GridColumn.sortable}; set `false` to make sorting
	 * opt-in. Sorting still flows through the {@link GridDataProps.sort} binding.
	 * @defaultValue true
	 */
	sortable?: boolean

	/**
	 * Groups rows by a single column's value, drawing an expandable group-header
	 * row (the shared value plus a row count) above each run. Pass a
	 * {@link GridGroupBy} binding whose `value` is the grouped column id, or `null`
	 * to leave the grid ungrouped. Client-side by default — backed by the
	 * engine's grouped/expanded row models — or server-side with
	 * {@link GridGroupBy.manual}, where the backend groups and `rows` carries the
	 * group-header rows (marked by {@link GridGroupBy.groupRow}) interleaved with
	 * lazily fetched children.
	 *
	 * Grouping renders its own body, so while active it takes precedence over — and
	 * stands down — {@link GridDataProps.virtualize} and the
	 * {@link GridDataProps.navigable} cursor; sorting, filtering, search,
	 * selection, resizing, and pinning still apply. Client grouping also stands
	 * {@link GridDataProps.pagination} down; manual grouping composes with
	 * manual pagination and forces sort/search/filter manual.
	 *
	 * @see {@link GridGroupBy}
	 */
	groupBy?: GridGroupBy<T>

	/**
	 * Appends a total row under each group's leaves while {@link GridDataProps.groupBy}
	 * is active, carrying every aggregating column's figure over that group's
	 * rows (see {@link GridColumn.aggFunc}). The row collapses with its group —
	 * whose header reads the same figures — and renders only once a visible
	 * column aggregates. `'bottom'` names the placement. Stands down under
	 * {@link GridGroupBy.manual} grouping, where the backend owns the figures.
	 */
	groupTotalRow?: 'bottom'

	/**
	 * Appends a grand-total row after the body, aggregating every column with an
	 * {@link GridColumn.aggFunc} over the full filtered set — all pages under
	 * client pagination, the flat leaf set under grouping, the supplied page
	 * under server pagination (the grid holds nothing more). Works grouped or
	 * flat, and renders only once a visible column aggregates. `'bottom'` names
	 * the placement. Stands down under {@link GridGroupBy.manual} grouping,
	 * where the backend owns the figures.
	 */
	grandTotalRow?: 'bottom'

	selection?: GridSelection
	columnOrder?: GridColumnOrder
	columnManager?: GridColumnManagerConfig

	/**
	 * Column groups: a colored, labeled band drawn above a contiguous run of
	 * columns. Pass a plain array of {@link GridColumnGroup} for the declarative
	 * case, or a {@link GridColumnGroups} binding to control the group layout the
	 * column manager produces. Each group names its member `columns` (kept
	 * adjacent and moved as a block), a `title`, and a `color` from the standard +
	 * extended {@link Badge} palette; a `collapsible` group folds to its first
	 * column with an expand toggle. When the column manager is enabled, its dialog
	 * gains a group editor — create a group, drag columns into it, and set its name
	 * and color.
	 *
	 * @see {@link GridColumnGroups}
	 */
	groups?: GridColumnGroups

	/**
	 * Pagination binding backed by the grid's TanStack Table engine. In server
	 * mode (the default once `rowCount`/`pageCount` is supplied) the consumer
	 * feeds each page as `rows`; in client mode the grid slices `rows` itself.
	 * Renders a footer with a row-range status, page navigation, and an optional
	 * page-size picker. Omit to render every row with no footer.
	 *
	 * @see {@link GridPagination}
	 */
	pagination?: GridPagination

	/**
	 * Enables drag- and keyboard-resizing of data columns through the grid's
	 * TanStack Table engine, over the automatic content sizing. Each data column's
	 * header gains a resize handle on its trailing edge, carrying an always-visible
	 * grip — a short centred bar that tints on hover and turns accent on keyboard
	 * focus or active drag. Columns auto-size to their content by default (a `px`
	 * {@link GridColumn.width} seeds one's initial width instead). The first manual
	 * resize — a drag or a keyboard nudge — takes width control: every column holds
	 * where it sits, so resizing one never reflows the others, and the table then
	 * grows or shrinks freely (trailing space or a horizontal scroll) rather than
	 * re-fitting. Widths persist through {@link GridDataProps.columnSizing}. The
	 * header context menu's "Auto-size columns" clears every held width — manually
	 * resized and `width`-seeded alike — and re-arms auto-fit. Set `false` to drop
	 * the handles (columns still auto-size).
	 * @defaultValue true
	 */
	resizable?: boolean

	/**
	 * Controlled/uncontrolled column-width state; pairs with
	 * {@link GridDataProps.resizable} to persist widths. Providing a controlled
	 * `value` stands the automatic content sizing down — the consumer owns every
	 * width.
	 */
	columnSizing?: GridColumnSizing

	/**
	 * Quick-search binding backed by the engine's global filter; renders a search
	 * field above the table that searches columns declaring a
	 * {@link GridColumn.value} accessor. Client-side by default; set `manual` for
	 * server-side.
	 *
	 * @see {@link GridSearch}
	 */
	search?: GridSearch

	/**
	 * Per-column filter binding; columns opting in via {@link GridColumn.filterable}
	 * (with a {@link GridColumn.value} accessor) surface a filter row of text
	 * inputs. Shares the table-wide filter mode with {@link GridDataProps.search}.
	 *
	 * @see {@link GridColumnFilters}
	 */
	columnFilters?: GridColumnFilters

	/**
	 * Right-click context menus: a `column` menu on headers (Sort ascending /
	 * descending, Auto-size columns, Manage columns, one item per active export
	 * type) and a `cell` menu on body cells (Copy, one item per active export
	 * type). On by default; pass `false` to disable. Each side takes the
	 * defaults (`true`) or a builder that reshapes them. "Manage columns" opens
	 * the column manager, rendering its dialog even without the toolbar button —
	 * unless {@link GridColumnManagerConfig.enabled} is `false`, which drops it.
	 * The export items appear only when {@link GridDataProps.exportable} is on.
	 *
	 * @see {@link GridContextMenu}
	 * @defaultValue `{ column: true, cell: true }`
	 */
	contextMenu?: GridContextMenuConfig<T> | false

	/**
	 * Enables export of the grid's rows. The shorthand `true` enables the
	 * default set — CSV, Excel, and print — each surfaced as an item in the
	 * header and cell context menus and in a toolbar "Export" dropdown. Pass an
	 * explicit {@link GridExportEntry} array to choose a subset, reorder them, or
	 * override a type's behavior: a bare type (`'csv'`) runs its built-in
	 * exporter, while an object entry (`{ csv: { onExport } }`) replaces it —
	 * required for any type beyond the three built-ins, which have no default to
	 * fall back to.
	 *
	 * Every type exports the same rows: the filtered and sorted set (all pages),
	 * or just the selected rows when a {@link GridDataProps.selection} is active.
	 * Each row reads a column's {@link GridColumn.value}, falling back to the row
	 * field named by the column id; columns without either export an empty
	 * field. Off by default so a grid doesn't expose a bulk export unless asked.
	 * @defaultValue false
	 */
	exportable?: boolean | GridExportEntry<T>[]

	/**
	 * Adds a drag handle to each reorderable column header — every visible,
	 * non-pinned data column — letting the user reorder columns by pointer or
	 * keyboard. Commits through `columnOrder`; `select`, `actions`, and `pinned`
	 * columns hold their position. No handles render until at least two columns
	 * are reorderable.
	 * @defaultValue false
	 */
	reorder?: boolean

	/**
	 * Enables per-row master-detail: an expandable panel beneath each row
	 * rendering an arbitrary React sub-component. Pass a {@link GridExpandable}
	 * binding with the detail `render`, and add an {@link GridColumn.expander}
	 * column for the disclosure chevron. The panel spans the full row width and
	 * opens over an auto-height transition.
	 *
	 * Renders in the plain flat body, so — like grouping — it stands down
	 * {@link GridProps.virtualize | virtualization} (detail rows break the
	 * uniform row height a window assumes), the {@link GridProps.navigable |
	 * cursor}, and row {@link GridProps.rowReorder | reorder} while active;
	 * sorting, filtering, search, selection, pagination, resizing, and pinning
	 * still apply.
	 *
	 * @see {@link GridExpandable}
	 */
	expandable?: GridExpandable<T>

	/**
	 * Enables drag-reordering of rows. Add a {@link GridColumn.dragHandle} column
	 * (usually leading) for the grip, and pass this binding's `onReorder` to
	 * commit the new order back onto your `rows` — the consumer owns the data, so
	 * the grid reports the reordered set rather than mutating it. Each row's grip
	 * drags by pointer or keyboard (`@dnd-kit`), moving the row within the set.
	 *
	 * Reordering is a manual ordering of the natural row order, so the grid stands
	 * it down — the handles turn inert — whenever that order isn't what's shown: an
	 * active column {@link GridProps.sort | sort}, a filtered/searched view,
	 * {@link GridProps.pagination | pagination}, {@link GridProps.virtualize |
	 * virtualization}, or an empty/loading grid. Not combinable with column
	 * {@link GridProps.reorder} on the same grid (row reorder takes precedence).
	 *
	 * @see {@link GridRowReorder}
	 */
	rowReorder?: GridRowReorder<T>

	/**
	 * Adds a keyboard cell cursor over the data cells. The grid becomes a single
	 * tab stop (`role="grid"`) whose active cell moves with the arrow keys, Home/End
	 * (row edges), Ctrl/Cmd+Home/End (grid corners), and PageUp/PageDown, tracked
	 * for assistive tech through `aria-activedescendant` and ringed on screen.
	 * Enter/Space activates the active cell's {@link GridDataProps.onCellClick}
	 * and the active row's {@link GridDataProps.onRowClick}, in that order;
	 * clicking a cell seats the cursor there.
	 *
	 * Off by default, so a static table keeps the browser/screen-reader's native
	 * table navigation; opt in for a spreadsheet-style read-only grid. Focusable
	 * cell content (links, buttons, the selection checkbox) stays independently
	 * tabbable — the cursor is additive, not a focus trap.
	 * @defaultValue false
	 */
	navigable?: boolean

	/**
	 * Truncate overflowing cell content to a single line with an ellipsis, and
	 * show a tooltip with the full content on hover/focus when a cell is
	 * truncated. A column supersedes or disables that tooltip via
	 * {@link GridColumn.cellTooltip}. Set `false` to let cells wrap instead.
	 * @defaultValue true
	 */
	truncate?: boolean

	/** Returns an extra class for a row's `<tr>`, or `undefined` for none; receives the row datum. */
	rowClassName?: (row: T) => string | undefined

	/**
	 * Invoked when a row is clicked, with the row datum and the originating
	 * event. A click that lands on interactive cell content — a button, link,
	 * input, or the selection checkbox — is ignored, so per-row controls keep
	 * working. Place primary actions in an interactive cell rather than relying
	 * on the row click alone for the clearest screen-reader semantics.
	 *
	 * @remarks A row handler makes the rows a roving-tabindex group: the grid is
	 * one Tab stop, Up/Down move focus between rows, and Enter / Space activates
	 * the focused row. A {@link GridDataProps.onCellClick | cell handler} takes
	 * precedence (the cells rove instead); the navigable cursor and the
	 * virtualized body stand row roving down — the latter keeping a per-row Tab
	 * stop instead.
	 */
	onRowClick?: GridRowClick<T>

	/**
	 * Invoked when a data cell is clicked, with the {@link GridCellClickContext}
	 * — the row datum, its key, the column id, and the cell's value (the
	 * column's {@link GridColumn.value} accessor, else the row field named by
	 * the column id) — and the originating event. Fires ahead of
	 * {@link GridDataProps.onRowClick} on the same click. The
	 * interactive-content guard of `onRowClick` applies, and a click on a
	 * non-data cell (selection, actions, drag handle, expander) is ignored.
	 *
	 * @remarks A cell handler makes the data cells a roving-tabindex group: the
	 * grid is one Tab stop, the arrow keys move focus between cells
	 * (Up/Down/Left/Right), and Enter / Space activates the focused cell — the
	 * keyboard peer of the pointer click. Stands down under
	 * {@link GridDataProps.navigable}, whose cursor owns the keyboard (its Enter
	 * fires this too), and under {@link GridDataProps.virtualize}, whose rows
	 * unmount on scroll.
	 */
	onCellClick?: GridCellClick<T>

	/**
	 * Invoked when a row is double-clicked, with the row datum and the
	 * originating event — a secondary "open" affordance layered over a primary
	 * {@link GridDataProps.onRowClick}. Per the DOM's event order a double-click
	 * also fires the single-click handlers twice first; keep the two actions
	 * compatible. The interactive-content guard of `onRowClick` applies.
	 */
	onRowDoubleClick?: GridRowClick<T>

	/**
	 * Invoked when a data cell is double-clicked, with the
	 * {@link GridCellClickContext} and the originating event — the cell-level
	 * counterpart of {@link GridDataProps.onRowDoubleClick}, fired ahead of it
	 * on the same double-click.
	 */
	onCellDoubleClick?: GridCellClick<T>

	/**
	 * Human-readable name for a row; labels its selection checkbox
	 * ("Select {label}"). Falls back to the raw row key.
	 */
	rowLabel?: (row: T) => string

	/**
	 * Header configuration. A `position` of `'sticky'` pins the header row while
	 * the body scrolls, forcing a scroll wrapper around the table.
	 *
	 * @see {@link GridHeader}
	 */
	header?: GridHeader

	/**
	 * Footer configuration: an opt-in summary bar below the table with a row-count
	 * total, a selected-row count, and a custom content slot — each rendered only
	 * when enabled. Independent of {@link GridDataProps.pagination}, whose own
	 * footer sits beneath this bar when both are set. Omit for no footer.
	 *
	 * @see {@link GridFooter}
	 */
	footer?: GridFooter

	/** Caps the table height (any CSS length) behind a scroll wrapper; required by {@link GridDataProps.virtualize}. */
	maxHeight?: string

	/**
	 * Replaces the body with a loading skeleton and marks the table `aria-busy`.
	 * @defaultValue false
	 */
	loading?: boolean

	/** Marks individual rows as loading, applying a per-row loading treatment; distinct from the whole-grid {@link GridDataProps.loading}. */
	rowLoading?: (row: T) => boolean

	/**
	 * Content shown in place of the body when `rows` is empty and `loading` is
	 * false.
	 * @defaultValue A "No items" message.
	 */
	empty?: ReactNode

	/**
	 * Error state shown in place of the body — for a failed data fetch, where
	 * there are no rows to render but the cause isn't "no items". Takes
	 * precedence over `empty` and is hidden while `loading`. Pass a node (e.g. an
	 * `Alert` with a retry control) to render it, or `true` for a default error
	 * `Alert`. Omit (or `false`) to fall back to the `empty` slot.
	 */
	error?: ReactNode

	/**
	 * Enables row virtualization via `@tanstack/react-virtual`. Only rows in
	 * the scroll viewport (plus overscan) render to the DOM. Requires
	 * `maxHeight`, which sizes the scroll container.
	 *
	 * Pass `true` for defaults (10 overscan, and a row-height estimate that
	 * scales with {@link GridDataProps.density} — 36 / 44 / 52px for
	 * compact / snug / loose), or an object to tune. Assumes uniform row
	 * heights.
	 *
	 * Without virtualization every row in `rows` renders to the DOM; past
	 * ~500 rows initial render and column-state changes become slow. Enable
	 * virtualization at that scale.
	 */
	virtualize?: GridVirtualize

	/**
	 * Infinite-scroll binding: as the {@link GridDataProps.virtualize | virtualized}
	 * window nears the end of the loaded rows, the grid calls `onLoadMore` so you
	 * can append the next batch to `rows` — a local slice, or a server fetch —
	 * showing a trailing pulsing skeleton row while `loadingMore`. Requires
	 * `virtualize` (and thus `maxHeight`), which supplies the windowed scroll
	 * container, and replaces the paged {@link GridDataProps.pagination} footer;
	 * passing both throws. Stands down with virtualization under
	 * {@link GridDataProps.groupBy | grouping}.
	 *
	 * @see {@link GridInfiniteScroll}
	 */
	infiniteScroll?: GridInfiniteScroll

	/**
	 * Props spread onto the underlying `<table>` element. Use to attach a ref,
	 * keyboard handlers, or ARIA attributes (e.g. `role="grid"`) directly to
	 * the semantic element.
	 */
	tableProps?: TableElementProps

	/**
	 * Bakes per-row inline editing into the grid. Supply an
	 * {@link GridEditableConfig}: which rows are editable and a commit sink. A row
	 * in the editable set puts all of its editable cells into edit mode at once;
	 * edits stage live, and removing the row from the set saves its changed cells
	 * as one batch. A column binds to a row property via {@link GridColumn.field},
	 * and the editor is inferred from the value's primitive type unless the column
	 * supplies an {@link GridColumn.editCell} slot. Omit for a read-only grid.
	 */
	editable?: GridEditableConfig

	/** Extra class merged onto the underlying `<table>` element. */
	className?: string

	/** The grid renders from `columns`/`rows`, not JSX children. */
	children?: never
}
