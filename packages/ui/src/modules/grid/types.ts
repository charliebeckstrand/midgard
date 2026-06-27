import type { HTMLAttributes, ReactElement, ReactNode } from 'react'

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
	/** Marks this as the selection column; renders the row-select checkboxes instead of a cell value. */
	selectable?: boolean
	/** Renders per-row action controls (e.g. a menu) in this column's cell. */
	actions?: (row: T) => ReactNode
	/** Renders the cell content for a row; defaults to nothing when omitted. */
	cell?: (row: T) => ReactNode
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
	 * Per-row props spread onto the underlying `<td>`. Use to wire ARIA, data
	 * attributes, or handlers (e.g. `role="gridcell"` + `onMouseDown` for a
	 * composite-widget wrapper like GridEditable). Returned `className` is
	 * merged with the column's static `className`.
	 */
	cellProps?: (row: T) => Omit<HTMLAttributes<HTMLTableCellElement>, 'children'>
	className?: string
	headerClassName?: string
	/** Column width as a CSS length; under {@link GridProps.resizable} a `px` value seeds the initial resize width. */
	width?: string
	/**
	 * Minimum width (px) the column can be resized to.
	 * @defaultValue {@link DEFAULT_MIN_COLUMN_SIZE}
	 */
	minWidth?: number
	/** Maximum width (px) the column can be resized to; unbounded when omitted. */
	maxWidth?: number
	/**
	 * Freezes the column against a horizontal scroll, pulling it to that edge and
	 * sticking it there. `'left'` / `'right'` pick the edge; `true` is `'left'`.
	 * A pinned column is also locked — it can't be reordered or hidden, shows in the
	 * column manager's pinned group, and marks its header with a pin button that
	 * unpins it on click. Multi-column stacking needs known widths (a
	 * `resizable`/fixed-layout grid, or a column `width`); a lone pinned column on a
	 * side needs neither. This is the column's initial pin — the header context
	 * menu's Pin left / Pin right / Unpin items override it at runtime.
	 */
	pinned?: boolean | 'left' | 'right'
	/**
	 * When false, the column cannot be hidden from the column manager.
	 * @defaultValue true
	 */
	hideable?: boolean
}

/** A column as the {@link GridColumnManager} sees it: id, display `title`, and the pin/hideable flags. */
export type GridColumnManagerItem = {
	id: string | number
	title: ReactNode
	/** Pinned columns cannot be reordered or hidden. */
	pinned?: boolean
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
	 * Adds a "Go to page" number input to the footer for jumping directly to a
	 * page. Shows only when the total page count is known and exceeds one; the
	 * entry is clamped to the valid range. Off by default.
	 * @defaultValue false
	 */
	jumpToPage?: boolean

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
	manual?: boolean
}

/**
 * One entry in a Grid context menu: an actionable item, or a separator. The
 * defaults the grid supplies — and anything a {@link GridColumnMenu} /
 * {@link GridCellMenu} builder returns — render as menu items in order.
 */
export type GridMenuItem =
	| {
			/** Stable identity for the item. */
			key: string
			label: ReactNode
			/** Leading icon element (e.g. a lucide icon); rendered through `Icon`. */
			icon?: ReactElement
			/** Runs when the item is chosen; the menu closes afterward. */
			onSelect: () => void
			disabled?: boolean
	  }
	| { key: string; separator: true }

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
	/** Exports the filtered/sorted rows to a CSV download, or `undefined` when {@link GridProps.exportable} is off. */
	exportCsv: (() => void) | undefined
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
}

/**
 * Body-cell context-menu config: `true` (or omit / `false`) for the default Copy
 * item, or a builder receiving the {@link GridCellMenuContext} and that default,
 * returning the final item list.
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
