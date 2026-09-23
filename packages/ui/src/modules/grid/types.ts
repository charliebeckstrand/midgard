import type { ComponentProps, ReactNode } from 'react'
import type { ContextMenuEntry } from '../../components/context-menu'
import type { QueryField, QueryFieldType, QueryGroup } from '../query'
import type { GridExportAction } from './engine/grid-export/types'
import type { GridEditCell, GridRowActionsContext } from './grid-editing-types'

/** The built-in per-column aggregation names. @see {@link GridColumn.aggFunc} */
export type GridAggFuncName = 'sum' | 'avg' | 'min' | 'max' | 'count'

/**
 * A column's aggregation: a built-in name reducing the column's numeric
 * values, or a function over the rows themselves. An aggregate spanning
 * several fields (a weighted ratio) needs row access, not one column's values.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridAggFunc<T> = GridAggFuncName | ((rows: T[]) => unknown)

/**
 * Context for a {@link GridColumn.aggCell} renderer: the aggregated `value`
 * and the `rows` it was computed over. That is a group's leaves on a group
 * row, and the whole filtered set on the grand total.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridAggCellContext<T> = {
	/** The column's aggregate over {@link GridAggCellContext.rows}. */
	value: unknown
	/** The rows behind the aggregate. */
	rows: T[]
}

/**
 * One column of a {@link Grid}: its id, header `title`, optional cell
 * renderer, and per-column flags for sorting, selection, actions, and
 * column-manager behavior.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridColumn<T> = {
	id: string | number
	title?: ReactNode
	/** Whether this data column is sortable. Set `false` to opt a column out; sorting flows through the grid's `sort` binding. @defaultValue true */
	sortable?: boolean
	/**
	 * Client-side comparator for this column, overriding the smart default (which
	 * already handles numbers, comma-grouped numbers, currency, percentages,
	 * dates, and natural string order). Receives two rows and returns a negative,
	 * zero, or positive number for ascending order; the grid flips it for
	 * descending. Runs under client sorting only — it is ignored when
	 * {@link GridSort.manual} defers sorting to the consumer.
	 */
	sortFn?: (a: T, b: T) => number
	/** Adds a filter button to this column's header that opens a query-builder sheet (settled with Apply); requires {@link GridColumn.value}. */
	filterable?: boolean
	/**
	 * Editor the filter sheet uses for this column: a text input, a number
	 * input, a {@link GridColumn.filterOptions} select, a date picker, or a
	 * boolean is-true/is-false toggle. The column's {@link GridColumn.value} must
	 * return a value the matching operators compare against — an ISO `YYYY-MM-DD`
	 * string for `date`, a boolean for `boolean`.
	 * @defaultValue 'text'
	 */
	filterType?: QueryFieldType
	/**
	 * Options for a `select` {@link GridColumn.filterType}. Omit to offer the
	 * column's own values instead, faceted from the data (the distinct
	 * {@link GridColumn.value}s among the rows other filters leave, sorted and
	 * de-duplicated). Unavailable under server-side filtering.
	 */
	filterOptions?: NonNullable<QueryField['options']>
	/**
	 * Marks this as the selection column; renders the row-select checkboxes
	 * instead of a cell value. Defaults to a natural checkbox width rather than a
	 * full data-column width; set {@link GridColumn.width} to override. Always
	 * frozen to the far left ahead of any left-{@link GridColumn.pinned | pinned}
	 * column once the grid pins a column. The checkboxes therefore stay anchored
	 * while the grid scrolls sideways. Until something is pinned it sits inline
	 * like any column.
	 */
	selectable?: boolean
	/**
	 * Renders per-row action controls (e.g. a menu) in this column's cell. The
	 * second argument carries the row's editing state and the two ways to end it. A
	 * save and a discard control can therefore live beside the row they act on.
	 */
	actions?: (row: T, context: GridRowActionsContext) => ReactNode
	/**
	 * Marks this as the row drag-handle column: renders a grip that drags its row
	 * to reorder it, rather than a cell value. Effective only while the grid is
	 * {@link GridProps.rowReorder | row-reorderable}. The handle is present but
	 * inert otherwise (and while a column sort orders the rows, since a manual
	 * order only holds against the natural order). Like {@link GridColumn.selectable}
	 * it is a non-data column — never sorted, filtered, resized, or column-reordered
	 * — and defaults to a natural grip width; set {@link GridColumn.width} to override.
	 */
	dragHandle?: boolean
	/**
	 * Marks this as the row-expander column: renders a disclosure chevron that
	 * opens the row's master-detail panel, rather than a cell value. Effective
	 * only while the grid is {@link GridProps.expandable | expandable} (and the
	 * row passes {@link GridExpandable.rowExpandable}); inert otherwise. Like
	 * {@link GridColumn.selectable} it is a non-data column — never sorted,
	 * filtered, resized, or column-reordered — and defaults to a natural chevron
	 * width; set {@link GridColumn.width} to override.
	 */
	expander?: boolean
	/** Renders the cell content for a row; defaults to nothing when omitted. */
	cell?: (row: T) => ReactNode
	/**
	 * Row property this column reads and writes while the grid is
	 * {@link GridProps.editable | editable} and the cell's row is in edit mode. A
	 * data column with a `field` (or an {@link GridColumn.editCell} slot) is
	 * editable. The editor the grid mounts is inferred from the field value's
	 * primitive type (string → text, number → number, boolean → yes/no listbox).
	 * The committed value flows out through {@link GridEditableConfig.onCommit}.
	 */
	field?: keyof T
	/**
	 * Opts this data column out of editing in an {@link GridProps.editable | editable}
	 * grid: the cursor still visits its cells, but they never enter edit mode. Has
	 * no effect on a non-editable grid.
	 * @defaultValue false
	 */
	readOnly?: boolean
	/**
	 * Custom in-cell editor for an {@link GridProps.editable | editable} grid,
	 * superseding the primitive-typed editor the grid would otherwise infer.
	 * Receives the cell's value plus `onValueUpdate` / `commit` / `cancel`; render
	 * a control (select, date picker, currency input, …) and stage or commit the
	 * value through them.
	 */
	editCell?: GridEditCell<T>
	/**
	 * Validates an edited cell value in an {@link GridProps.editable | editable}
	 * grid. Receives the pending value and its row. Return an error message to
	 * reject it, or `null` to accept it. The editor shows the message inline while
	 * editing, and the cell is dropped (not emitted) when the row saves.
	 */
	validate?: (value: unknown, row: T) => string | null
	/**
	 * Marks this column's cells as required in an {@link GridProps.editable | editable}
	 * grid: each editor carries `aria-required`, so assistive tech announces the
	 * obligation (WCAG 1.3.1 / 3.3.2). This is the programmatic cue only — enforcing
	 * a non-empty value remains the consumer's, through {@link GridColumn.validate}.
	 * No effect on a non-editable or `readOnly` column.
	 * @defaultValue false
	 */
	required?: boolean
	/**
	 * Tooltip shown when this column's cell content is truncated (see
	 * {@link GridProps.truncate}). Receives the row and returns the tooltip
	 * content; return `null` to disable the tooltip for the column. When omitted,
	 * a truncated cell shows its own full content. No effect under
	 * `truncate={false}`.
	 */
	cellTooltip?: (row: T) => ReactNode
	/**
	 * Raw value for engine operations: sort, filter, aggregation, and export. It is
	 * distinct from {@link GridColumn.cell}, which renders. A column needs `value`
	 * to be searchable.
	 */
	value?: (row: T) => unknown
	/**
	 * Marks this data column as one the rows can be grouped by from the grid's
	 * chrome: the {@link GridGroupBy.groupButton | group-by button} shows on its
	 * header. A click groups the rows by the column, and a second click ungroups.
	 * Gates that button only; a `groupBy` binding can still name any data column
	 * directly.
	 * @defaultValue false
	 */
	groupable?: boolean
	/**
	 * Aggregates this column on the grouped body's group-header rows and the
	 * {@link GridProps.groupTotalRow | group} / {@link GridProps.grandTotalRow | grand}
	 * total rows. A built-in name reduces the column's values — its
	 * {@link GridColumn.value} accessor, else the row field named by the column
	 * id. They are coerced to numbers, with entries that don't parse skipped.
	 * `count` counts rows, and an otherwise empty set renders blank, never a
	 * fabricated zero. A function receives the rows themselves and returns any
	 * value.
	 * Rendered through {@link GridColumn.aggCell} when given, else locale number
	 * formatting.
	 */
	aggFunc?: GridAggFunc<T>
	/**
	 * Renders this column's aggregated value on group-header and total rows,
	 * superseding the default locale number formatting. Pair a currency column's
	 * `cell` with an `aggCell` reading the same formatter. Receives the
	 * {@link GridAggCellContext}: the aggregate and the rows behind it.
	 */
	aggCell?: (context: GridAggCellContext<T>) => ReactNode
	/**
	 * Per-row props spread onto the underlying `<td>`. Use to wire ARIA, data
	 * attributes, or handlers (e.g. `role="gridcell"` + `onMouseDown` for a
	 * composite-widget wrapper like the navigable/editable cursor). Returned
	 * `className` is merged with the column's static `className`.
	 */
	cellProps?: (row: T) => Omit<ComponentProps<'td'>, 'children'>
	className?: string
	headerClassName?: string
	/**
	 * The column's width. In a non-resizable grid this is its fixed CSS width. In a
	 * resizable grid ({@link GridProps.resizable}) a `px` value seeds the column's
	 * initial width. The column holds it, sitting out the automatic content sizing,
	 * until the header's "Auto-size all columns" or "Auto-size this column"
	 * releases it to content. "Reset column widths" restores it. A manual
	 * resize overrides the seed, and, like any manual resize, holds every column
	 * where it sits. A drag can't cross the {@link GridColumn.minWidth} floor, so a
	 * single-word header stays whole. Omit it to size to content from the first
	 * render. Columns share the width evenly when there is room to spare, and any
	 * column whose content would truncate takes more.
	 *
	 * A number is px, matching {@link GridColumn.minWidth} and
	 * {@link GridColumn.maxWidth}, which are numbers already. A string is a CSS
	 * width. Only a plain `px` or unitless one is read as a seed; a relative or
	 * `auto` width leaves the column on content sizing.
	 */
	width?: number | string
	/**
	 * Minimum width (px); the floor the automatic sizing and a drag-resize never go
	 * below. A single-word header sets its own floor (its full width, so it never
	 * truncates) when larger than this.
	 * @defaultValue {@link DEFAULT_MIN_COLUMN_SIZE}
	 */
	minWidth?: number
	/**
	 * Maximum width (px); the ceiling a drag-resize and the automatic sizing never
	 * exceed. Also lifts the cap the autosizer otherwise places on measured content
	 * width, so a column with wide content can opt into showing more of it.
	 * Unbounded when omitted.
	 */
	maxWidth?: number
	/**
	 * Freezes the column against a horizontal scroll, pulling it to that edge and
	 * sticking it there. `'left'` / `'right'` pick the edge; `true` is `'left'`.
	 * A pinned column can't be reordered or hidden. It shows in the column
	 * manager's matching pinned group, left columns prepended and right appended.
	 * It marks its header with a pin button that unpins it on click. This is the column's
	 * initial pin. The user moves it at runtime through the header context menu's
	 * Pin left / Pin right / Unpin items, and the column manager's per-column pin
	 * control.
	 * @see {@link GridColumn.locked} for a freeze the user can't change.
	 */
	pinned?: boolean | 'left' | 'right'
	/**
	 * Freezes the column to an edge like {@link GridColumn.pinned}, but the user
	 * can't release it. There is no unpin button on its header, and no Pin / Unpin
	 * items in its context menu. The column manager shows a non-interactive edge
	 * arrow for it, rather than a pin control. `'left'` / `'right'` pick the edge; `true`
	 * is `'left'`. It still lists in the column manager's matching pinned group,
	 * left columns prepended and right appended. It is excluded from reorder and
	 * hide like a pinned column. Takes precedence over `pinned` and any runtime pin
	 * change.
	 *
	 * @remarks Use for columns that must stay frozen, such as a row's identity
	 * column or a permanent actions rail. There pinning is part of the grid's
	 * design rather than a user preference.
	 */
	locked?: boolean | 'left' | 'right'
	/**
	 * When false, the column cannot be hidden from the column manager.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/** A column as the {@link GridColumnManager} sees it: id, display `title`, and the pin/lock/hideable flags. */
export type GridColumnManagerItem = {
	id: string | number
	title: ReactNode
	/**
	 * The edge the column is currently frozen to, or `undefined` when it scrolls.
	 * A frozen column lists in the manager's matching group — `'left'` prepended,
	 * `'right'` appended — and can't be reordered or hidden. The per-column pin
	 * control writes the change back through {@link GridColumnManagerProps.onPinChange}.
	 */
	pinned?: 'left' | 'right'
	/**
	 * The edge the column is locked to, or `undefined` when it isn't locked. A
	 * locked column is frozen like {@link GridColumnManagerItem.pinned}. The manager
	 * shows a non-interactive edge arrow for it instead of a pin control, so the
	 * user can't release it.
	 */
	locked?: 'left' | 'right'
	/**
	 * When false, the column cannot be hidden.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/**
 * Active page coordinate: the zero-based `pageIndex` and the `pageSize`.
 * Structurally identical to TanStack Table's `PaginationState`, so it threads
 * straight into a `useReactTable` instance.
 */
export type GridPaginationState = {
	pageIndex: number
	pageSize: number
}

/**
 * Controlled/uncontrolled pagination binding for {@link GridProps.pagination},
 * backed by the grid's TanStack Table engine.
 *
 * @remarks Two modes, selected by {@link GridPagination.manual}. In server
 * mode (the default once `rowCount` or `pageCount` is given) the grid never
 * slices. It advertises the page controls and emits page changes through
 * `onValueChange`. The consumer fetches that page and feeds it back as `rows`,
 * which is TanStack's `manualPagination` contract. In client mode the grid
 * paginates the full `rows` array itself.
 */
export type GridPagination = {
	value?: GridPaginationState
	defaultValue?: GridPaginationState
	onValueChange?: (pagination: GridPaginationState) => void

	/**
	 * Total row count across all pages (TanStack `rowCount`); the grid derives
	 * the page count from it. Supply in server mode so the last page is known.
	 */
	rowCount?: number

	/** Total page count (TanStack `pageCount`); takes precedence over deriving from {@link GridPagination.rowCount}. */
	pageCount?: number

	/** Page sizes offered by the footer's size picker; omit to hide the picker entirely. */
	pageSizeOptions?: number[]

	/**
	 * Server-side (manual) pagination: the consumer supplies each page's `rows`
	 * and a `rowCount`/`pageCount`. When omitted, defaults to `true` if either
	 * total is given, else `false` (client-side slicing of `rows`).
	 */
	manual?: boolean
}

/**
 * Per-column widths in pixels, keyed by stringified column id — structurally
 * TanStack Table's `ColumnSizingState`.
 */
export type GridColumnSizingState = Record<string, number>

/**
 * Controlled/uncontrolled column-width binding for {@link GridProps.columnSizing},
 * backed by the grid's TanStack Table engine. Pairs with
 * {@link GridProps.resizable} to persist and restore drag-resized widths.
 *
 * @remarks `onValueChange` reports *user/consumer* width changes: a drag, a
 * keyboard nudge, an Auto-size action, a controlled write. It settles once the
 * gesture does (debounce a persist on it to "save when the resize finishes").
 * The grid's own content auto-fit does **not** fire it. The fit updates the
 * rendered widths but isn't a preference, so persisting `onValueChange` never
 * saves autosized widths, only deliberate ones. "Reset column widths" fires it
 * with `{}`: the user gave the widths back to the grid.
 *
 * A `value`/`defaultValue` seeded on mount is honoured as a manual width. The
 * grid mounts with the user in control, so restored widths hold on reload
 * rather than being re-fit. The binding therefore round-trips: persist what
 * `onValueChange` reports, and feed it back as `defaultValue`.
 */
export type GridColumnSizing = {
	value?: GridColumnSizingState
	defaultValue?: GridColumnSizingState
	onValueChange?: (sizing: GridColumnSizingState) => void
	/**
	 * Fires with the column id when a pointer/touch drag-resize begins. Pair with
	 * {@link GridColumnSizing.onResizeEnd} to bracket the drag. A keyboard nudge
	 * has no drag lifecycle — it commits straight through
	 * {@link GridColumnSizing.onValueChange} — so it fires neither.
	 */
	onResizeStart?: (columnId: string) => void
	/**
	 * Fires with the column id when a pointer/touch drag-resize ends. The settled
	 * width has already flowed through {@link GridColumnSizing.onValueChange}; this
	 * only marks the drag's conclusion (e.g. to re-enable something held down over
	 * it).
	 */
	onResizeEnd?: (columnId: string) => void
}

/**
 * Controlled/uncontrolled quick-search binding for {@link GridProps.search},
 * backed by the grid's TanStack Table engine.
 *
 * @remarks Searches the columns that declare a {@link GridColumn.value}
 * accessor. Client-side by default — the engine filters `rows`; set `manual` for
 * server-side, where the consumer refetches from the emitted query and feeds
 * back `rows`.
 */
export type GridSearch = {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
	/**
	 * Server-side (manual) filtering: the consumer refetches from the emitted
	 * query and feeds back `rows`; the grid doesn't filter locally.
	 *
	 * @remarks Filtering mode is table-wide — the search and the column filters
	 * ({@link GridColumnFilters.manual}) share one engine model, so set both the
	 * same. If they disagree the grid runs manual for both (a dev warning fires)
	 * and the client-side surface won't filter.
	 * @defaultValue false
	 */
	manual?: boolean
	/**
	 * How the query acts on the rows. `'filter'` prunes — non-matching rows drop
	 * from the view (the default quick-search). `'highlight'` keeps every row
	 * instead. The matched substring is marked in each cell the search scans (the
	 * columns declaring a {@link GridColumn.value}). A match therefore reads as an
	 * emphasis rather than a prune.
	 *
	 * @remarks Highlighting decorates the rendered value, so it marks the text a
	 * cell renders. That is a plain string, or the string leaves nested inside a
	 * custom `cell` node. A non-text cell passes through unmarked. Independent of
	 * {@link GridColumnFilters}, which always prune; a highlight-mode search paired
	 * with active column filters marks matches among the rows those filters leave.
	 * Under {@link GridSearch.manual} the grid never prunes anyway, so this only
	 * governs whether the returned rows are also marked.
	 * @defaultValue 'filter'
	 */
	mode?: 'filter' | 'highlight'
	/**
	 * Placeholder for the search input.
	 * @defaultValue 'Search'
	 */
	placeholder?: string
}

/**
 * One column's filter: its id and the query tree the column filters by,
 * structurally TanStack's `ColumnFilter`.
 *
 * @remarks The value is typed rather than `unknown`. The grid's filter function
 * evaluates it as a {@link QueryGroup} and reads anything else as no filter.
 * The engine's own state stays `unknown`-valued, which a narrower type is
 * assignable to.
 */
export type GridColumnFilterState = { id: string; value: QueryGroup }

/**
 * Controlled/uncontrolled per-column filter binding for
 * {@link GridProps.columnFilters}, backed by the grid's TanStack Table engine.
 *
 * @remarks Columns opt in with {@link GridColumn.filterable} (which needs a
 * {@link GridColumn.value} accessor). Each filterable column shows a filter
 * button in its header. The button opens a query-builder sheet.
 * Client-side by default; `manual` defers filtering to the consumer, which
 * shares the table-wide filter mode with {@link GridSearch}.
 */
export type GridColumnFilters = {
	value?: GridColumnFilterState[]
	defaultValue?: GridColumnFilterState[]
	onValueChange?: (filters: GridColumnFilterState[]) => void
	/**
	 * Server-side (manual) filtering: the consumer refetches from the emitted
	 * filters and feeds back `rows`; the grid doesn't filter locally.
	 *
	 * @remarks Filtering mode is table-wide — the column filters and the search
	 * ({@link GridSearch.manual}) share one engine model, so set both the same. If
	 * they disagree the grid runs manual for both (a dev warning fires) and the
	 * client-side surface won't filter.
	 * @defaultValue false
	 */
	manual?: boolean
	/**
	 * How each filterable column surfaces its filter. `'header'` (default) shows the
	 * funnel button in every filterable column header. `'menu'` drops the resting
	 * funnel, so it never takes header width. It offers the filter from the
	 * column's right-click menu instead. The funnel returns only once a filter is
	 * applied, as the edit/clear affordance.
	 * @defaultValue 'header'
	 */
	affordance?: 'header' | 'menu'
}

/**
 * One entry in a Grid context menu: an actionable {@link ContextMenuItem} (a
 * `{ label, icon, onAction }`) or a {@link ContextMenuSeparator}. The defaults
 * the grid supplies render in order through the shared context-menu renderer,
 * and so does anything a {@link GridColumnMenu} / {@link GridCellMenu} builder
 * returns. It is the same schema a chart's menu uses.
 */
export type GridMenuItem = ContextMenuEntry

/**
 * The surfaces a grid tool offers itself on: a button in the toolbar's "Table
 * tools" cluster, an item in the right-click menus, or both. Export
 * ({@link GridExportConfig}) and the column manager
 * ({@link GridColumnManagerConfig}) take the same pair, defaulted the same way.
 * The menus carry the tool, and the toolbar button is opt-in, so one idiom
 * places every tool.
 *
 * @remarks Both `false` leaves the tool no chrome of its own. The column manager
 * still answers its `open` binding, which is how a host drives the dialog from
 * its own controls. Export contributes nothing, so turn it off with
 * `exportable={false}` instead, and keep the intent legible.
 */
export type GridToolSurfaces = {
	/**
	 * Render the tool's button in the toolbar's "Table tools" cluster.
	 * @defaultValue false
	 */
	toolbar?: boolean
	/**
	 * Offer the tool in the grid's right-click menus. Silent while the menu that
	 * would carry it is off (see {@link GridProps.contextMenu}).
	 * @defaultValue true
	 */
	contextMenu?: boolean
}

/**
 * Context for a {@link GridContextMenu.column} builder: the right-clicked column
 * and the actions its default items invoke.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridColumnMenuContext<T> = {
	column: GridColumn<T>
	/** This column's active sort direction, or `undefined` when it is not the sorted column. */
	sortDirection: 'asc' | 'desc' | undefined
	/** Sorts this column ascending through the grid's `sort` binding. */
	sortAscending: () => void
	/** Sorts this column descending. */
	sortDescending: () => void
	/** Clears the grid's active sort. */
	clearSort: () => void
	/** This column's frozen edge, or `undefined` when it scrolls. */
	pinned: 'left' | 'right' | undefined
	/**
	 * The edge this column is locked to, or `undefined` when it isn't locked. A
	 * locked column is frozen immutably — `pinLeft` / `pinRight` / `unpin` don't
	 * move it — and its default menu offers no pin items.
	 */
	locked: 'left' | 'right' | undefined
	/** Freezes this column against the left edge. */
	pinLeft: () => void
	/** Freezes this column against the right edge. */
	pinRight: () => void
	/** Releases this column back into the scrolling area. */
	unpin: () => void
	/**
	 * Sizes every data column to its content ("Auto-size all columns"), as
	 * `autoSizeColumn` sizes each one. It is `undefined` when the grid is not
	 * resizable.
	 */
	autoSizeColumns: (() => void) | undefined
	/**
	 * Sizes this column to its content ("Auto-size this column"). It is
	 * `undefined` when the grid is not resizable, or for one of the non-data
	 * columns (selection, actions, drag handle, expander). The rest of the columns hold where they sit.
	 */
	autoSizeColumn: (() => void) | undefined
	/**
	 * Gives the widths back to the grid's automatic fit ("Reset column widths"),
	 * as on a fresh mount with no saved widths. It is `undefined` when the grid is
	 * not resizable.
	 */
	resetColumnWidths: (() => void) | undefined
	/** Opens the column-manager dialog ("Manage columns"). */
	chooseColumns: () => void
	/** One action per configured export type (see {@link GridProps.exportable}); empty when export is off, or held back from the menus by its {@link GridToolSurfaces.contextMenu} switch. */
	exportActions: GridExportAction[]
}

/**
 * Header context-menu config: `true` (or omit) for the default items, or a
 * builder receiving the {@link GridColumnMenuContext} and those defaults. The
 * defaults are, in order:
 *
 * - Manage columns, when the column manager is reachable.
 * - Filter, under the `'menu'` filter affordance.
 * - The Sort menu (Sort ascending / Sort descending, less the direction the
 *   column already holds, plus Clear sort once the column is sorted).
 * - The Pin menu (Pin left / Pin right / Unpin).
 * - Group by …, when groupable.
 * - The Auto-size menu (this column, all columns, then Reset column widths),
 *   when resizing is on.
 * - The Export menu.
 *
 * No separator divides them.
 *
 * The builder returns the final list to
 * extend, reorder, or replace them. `false` omits the header menu entirely.
 *
 * @remarks Each of those menus is a hover-opened submenu holding its actions;
 * one that would hold a single action renders as that action instead.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridColumnMenu<T> =
	| boolean
	| ((context: GridColumnMenuContext<T>, defaults: GridMenuItem[]) => GridMenuItem[])

/**
 * Context for a {@link GridContextMenu.cell} builder: the right-clicked row, its
 * column, that cell's value, and a `copy` action.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellMenuContext<T> = {
	row: T
	column: GridColumn<T>
	/** The column's {@link GridColumn.value} for the row, else its rendered text. */
	value: unknown
	/** Copies the cell value to the clipboard. */
	copy: () => void
	/** One action per configured export type (see {@link GridProps.exportable}); empty when export is off, or held back from the menus by its {@link GridToolSurfaces.contextMenu} switch. */
	exportActions: GridExportAction[]
}

/**
 * Body-cell context-menu config: `true` for the default items, or a builder
 * that receives the {@link GridCellMenuContext} and the defaults. The builder
 * returns the final item list. The defaults are Copy, then the Export menu when
 * {@link GridProps.exportable} is on.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellMenu<T> =
	| boolean
	| ((context: GridCellMenuContext<T>, defaults: GridMenuItem[]) => GridMenuItem[])

/**
 * Right-click context menus for {@link GridProps.contextMenu}: a `column` menu on
 * headers and a `cell` menu on body cells. Each side is opt-in — a header or
 * cell shows its menu only when its side is set.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridContextMenu<T> = {
	column?: GridColumnMenu<T>
	cell?: GridCellMenu<T>
	/**
	 * Cap the menus at their density height, scrolling past it. Off by default —
	 * the grid's built-in rows are a short, fixed set, so a cap clips the last one
	 * and reads as truncation. Turn it on for a `column` / `cell` builder that adds
	 * enough rows to run past the viewport. Applies to the column and cell menus
	 * alike, and to their submenus.
	 * @defaultValue false
	 */
	capped?: boolean
}
