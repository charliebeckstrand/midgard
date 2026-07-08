import type { HTMLAttributes, ReactNode } from 'react'
import type { ContextMenuEntry } from '../../components/context-menu'
import type { GridExportAction } from './export/types'
import type { GridEditCell } from './grid-editing-types'

/**
 * A column's display label: its `title` when a plain string, else its `id`
 * stringified. Used wherever a column needs a textual name — header titles,
 * filter and export labels, and `aria-label`s — so the fallback stays uniform.
 *
 * @internal
 */
export function columnLabel(column: { id: string | number; title?: ReactNode }): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/** The built-in per-column aggregation names. @see {@link GridColumn.aggFunc} */
export type GridAggFuncName = 'sum' | 'avg' | 'min' | 'max' | 'count'

/**
 * A column's aggregation: a built-in name reducing the column's numeric
 * values, or a function over the rows themselves — an aggregate spanning
 * several fields (a weighted ratio) needs row access, not one column's values.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridAggFunc<T> = GridAggFuncName | ((rows: T[]) => unknown)

/**
 * Context for a {@link GridColumn.aggCell} renderer: the aggregated `value`
 * and the `rows` it was computed over — a group's leaves on a group row, the
 * whole filtered set on the grand total.
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
	filterType?: 'text' | 'number' | 'select' | 'date' | 'boolean'
	/**
	 * Options for a `select` {@link GridColumn.filterType}. Omit to offer the
	 * column's own values instead, faceted from the data (the distinct
	 * {@link GridColumn.value}s among the rows other filters leave, sorted and
	 * de-duplicated). Unavailable under server-side filtering.
	 */
	filterOptions?: { label: string; value: string }[]
	/**
	 * Marks this as the selection column; renders the row-select checkboxes
	 * instead of a cell value. Defaults to a natural checkbox width rather than a
	 * full data-column width; set {@link GridColumn.width} to override. Always
	 * frozen to the far left ahead of any left-{@link GridColumn.pinned | pinned}
	 * column once the grid pins a column, so the checkboxes stay anchored while the
	 * grid scrolls sideways; until something is pinned it sits inline like any
	 * column.
	 */
	selectable?: boolean
	/** Renders per-row action controls (e.g. a menu) in this column's cell. */
	actions?: (row: T) => ReactNode
	/**
	 * Marks this as the row drag-handle column: renders a grip that drags its row
	 * to reorder it, rather than a cell value. Effective only while the grid is
	 * {@link GridProps.rowReorder | row-reorderable}; the handle is present but
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
	 * editable; the editor the grid mounts is inferred from the field value's
	 * primitive type (string → text, number → number, boolean → yes/no listbox),
	 * and the committed value flows out through {@link GridEditableConfig.onValueChange}.
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
	 * grid. Receives the pending value and its row; return an error message to
	 * reject it — the editor shows the message inline while editing, and the cell
	 * is dropped (not emitted) when the row saves — or `null` to accept it.
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
	 * Raw value for engine operations — filtering today, sorting/grouping ahead —
	 * distinct from {@link GridColumn.cell}, which renders. A column needs `value`
	 * to be searchable.
	 */
	value?: (row: T) => unknown
	/**
	 * Marks this data column as one the rows can be grouped by from the grid's
	 * chrome: the {@link GridGroupBy.panel | group panel} offers it — a header
	 * affordance that groups on click or drags into the panel. Gates the panel
	 * only; a `groupBy` binding can still name any data column directly.
	 * @defaultValue false
	 */
	groupable?: boolean
	/**
	 * Aggregates this column on the grouped body's group-header rows and the
	 * {@link GridProps.groupTotalRow | group} / {@link GridProps.grandTotalRow | grand}
	 * total rows. A built-in name reduces the column's values — its
	 * {@link GridColumn.value} accessor, else the row field named by the column
	 * id, coerced to numbers with entries that don't parse skipped (`count`
	 * counts rows; an otherwise empty set renders blank, never a fabricated
	 * zero). A function receives the rows themselves and returns any value.
	 * Rendered through {@link GridColumn.aggCell} when given, else locale number
	 * formatting.
	 */
	aggFunc?: GridAggFunc<T>
	/**
	 * Renders this column's aggregated value on group-header and total rows,
	 * superseding the default locale number formatting — pair a currency
	 * column's `cell` with an `aggCell` reading the same formatter. Receives the
	 * {@link GridAggCellContext}: the aggregate and the rows behind it.
	 */
	aggCell?: (context: GridAggCellContext<T>) => ReactNode
	/**
	 * Per-row props spread onto the underlying `<td>`. Use to wire ARIA, data
	 * attributes, or handlers (e.g. `role="gridcell"` + `onMouseDown` for a
	 * composite-widget wrapper like the navigable/editable cursor). Returned
	 * `className` is merged with the column's static `className`.
	 */
	cellProps?: (row: T) => Omit<HTMLAttributes<HTMLTableCellElement>, 'children'>
	className?: string
	headerClassName?: string
	/**
	 * The column's width. In a non-resizable grid this is its fixed CSS width. In a
	 * resizable grid ({@link GridProps.resizable}) a `px` value seeds the column's
	 * initial width: the column holds it — sitting out the automatic content sizing —
	 * until the header's "Auto-size columns" releases it to content. A manual resize
	 * overrides the seed (and, like any manual resize, holds every column where it
	 * sits); a drag can't cross the {@link GridColumn.minWidth} floor, so a
	 * single-word header stays whole. Omit it to size to content from the first
	 * render: columns share the width evenly when there is room to spare, and any
	 * column whose content would truncate takes more.
	 */
	width?: string
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
	 * A pinned column can't be reordered or hidden, shows in the column manager's
	 * matching pinned group (left columns prepended, right appended), and marks its
	 * header with a pin button that unpins it on click. Multi-column stacking needs
	 * known widths (a `resizable`/fixed-layout grid, or a column `width`); a lone
	 * pinned column on a side needs neither. This is the column's initial pin — the
	 * user moves it at runtime through the header context menu's Pin left / Pin
	 * right / Unpin items and the column manager's per-column pin control.
	 * @see {@link GridColumn.locked} for a freeze the user can't change.
	 */
	pinned?: boolean | 'left' | 'right'
	/**
	 * Freezes the column to an edge like {@link GridColumn.pinned}, but the user
	 * can't release it: no unpin button on its header, no Pin / Unpin items in its
	 * context menu, and a non-interactive edge arrow (rather than a pin control) in
	 * the column manager. `'left'` / `'right'` pick the edge; `true` is `'left'`. It
	 * still lists in the column manager's matching pinned group — left columns
	 * prepended, right appended — and is excluded from reorder and hide like a
	 * pinned column. Takes precedence over `pinned` and any runtime pin change.
	 *
	 * @remarks Use for columns that must stay frozen — a row's identity column, a
	 * permanent actions rail — where pinning is part of the grid's design rather
	 * than a user preference.
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
	 * locked column is frozen like {@link GridColumnManagerItem.pinned} but the
	 * manager shows a non-interactive edge arrow for it instead of a pin control, so
	 * the user can't release it.
	 */
	locked?: 'left' | 'right'
	/**
	 * When false, the column cannot be hidden.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/** Snapshot of column-manager state — column `order` and `hidden` ids — captured by the save-preset action. */
export type GridColumnManagerPreset = {
	order: (string | number)[]
	hidden: (string | number)[]
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
 * slices: it advertises the page controls and emits page changes through
 * `onValueChange`, and the consumer fetches that page and feeds it back as
 * `rows` — TanStack's `manualPagination` contract. In client mode the grid
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
 */
export type GridColumnSizing = {
	value?: GridColumnSizingState
	defaultValue?: GridColumnSizingState
	onValueChange?: (sizing: GridColumnSizingState) => void
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
	 * Placeholder for the search input.
	 * @defaultValue 'Search'
	 */
	placeholder?: string
}

/** One column's filter — its id and filter value, structurally TanStack's `ColumnFilter`. */
export type GridColumnFilterState = { id: string; value: unknown }

/**
 * Controlled/uncontrolled per-column filter binding for
 * {@link GridProps.columnFilters}, backed by the grid's TanStack Table engine.
 *
 * @remarks Columns opt in with {@link GridColumn.filterable} (which needs a
 * {@link GridColumn.value} accessor), surfacing a filter row of text inputs.
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
}

/**
 * One entry in a Grid context menu: an actionable {@link ContextMenuItem} (a
 * `{ label, icon, onSelect }`) or a {@link ContextMenuSeparator}. The defaults
 * the grid supplies — and anything a {@link GridColumnMenu} / {@link GridCellMenu}
 * builder returns — render in order through the shared context-menu renderer,
 * the same schema a chart's menu uses.
 */
export type GridMenuItem = ContextMenuEntry

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
	/** Auto-sizes resizable columns to fill the width, or `undefined` when the grid is not resizable. */
	autoSizeColumns: (() => void) | undefined
	/** Opens the column-manager dialog ("Manage columns"). */
	chooseColumns: () => void
	/** One action per configured export type (see {@link GridProps.exportable}); empty when export is off. */
	exportActions: GridExportAction[]
}

/**
 * Header context-menu config: `true` (or omit) for the default items — Sort
 * ascending, Sort descending, Clear sort (when the column is sorted), Pin left /
 * Pin right / Unpin, Auto-size columns (when resizing is on), Manage columns —
 * or a builder receiving the {@link GridColumnMenuContext} and those defaults,
 * returning the final list to extend, reorder, or replace them. `false` omits
 * the header menu entirely.
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
	/** One action per configured export type (see {@link GridProps.exportable}); empty when export is off. */
	exportActions: GridExportAction[]
}

/**
 * Body-cell context-menu config: `true` (or omit / `false`) for the default
 * items — Copy, plus one item per active export type when
 * {@link GridProps.exportable} is on — or a builder receiving the
 * {@link GridCellMenuContext} and those defaults, returning the final item
 * list.
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
}
