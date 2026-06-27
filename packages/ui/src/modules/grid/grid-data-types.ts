import type { ReactNode } from 'react'
import type { TableElementProps, TableVariants } from '../../components/table'
import type { SortState } from './context'
import type { GridRowClick } from './grid-row'
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
	onValueChange?: (selection: Set<string | number> | undefined) => void
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
 * Column-manager binding for {@link GridProps.columnManager}: gates the
 * toolbar button and holds controlled/uncontrolled column-visibility state.
 * Column order lives on the top-level {@link GridProps.columnOrder}
 * binding, which the manager dialog reads and writes.
 */
export type GridColumnManagerConfig = {
	/**
	 * Render the toolbar button that opens the manage-columns dialog.
	 * @defaultValue false
	 */
	enabled?: boolean
	/**
	 * Label on the toolbar button (and dialog title).
	 * @defaultValue 'Columns'
	 */
	label?: ReactNode

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	/** Controlled open state of the manager dialog; pair with {@link GridColumnManagerConfig.onOpenChange}. */
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void

	/** Called when the manager's "save preset" action fires, with the current order and hidden ids. */
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Props for a read-only data {@link Grid}. `T` is the row datum type;
 * `columns` and the various renderers are keyed to it.
 *
 * @typeParam T - Shape of a single row.
 *
 * @internal
 */
export type GridDataProps<T> = TableVariants & {
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

	selection?: GridSelection
	columnOrder?: GridColumnOrder
	columnManager?: GridColumnManagerConfig

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
	 * TanStack Table engine; each data-column header gains a resize separator.
	 * A column's initial width comes from a `px` `width`, else a default, and
	 * widths persist through {@link GridDataProps.columnSizing}.
	 * @defaultValue false
	 */
	resizable?: boolean

	/** Controlled/uncontrolled column-width state; pairs with {@link GridDataProps.resizable} to persist widths. */
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
	 * descending, Auto-size columns, Manage columns) and a `cell` menu on body
	 * cells (Copy). On by default; pass `false` to disable. Each side takes the
	 * defaults (`true`) or a builder that reshapes them. "Manage columns" opens
	 * the column manager, rendering its dialog even without the toolbar button.
	 *
	 * @see {@link GridContextMenu}
	 * @defaultValue `{ column: true, cell: true }`
	 */
	contextMenu?: GridContextMenuConfig<T> | false

	/**
	 * Adds an "Export to CSV" item to the header context menu that downloads the
	 * grid's filtered and sorted rows (all pages) as a CSV file. Each row reads a
	 * column's {@link GridColumn.value}, falling back to the row field named by the
	 * column id; columns without either export an empty field. Off by default so a
	 * grid doesn't expose a bulk download unless asked.
	 * @defaultValue false
	 */
	exportable?: boolean

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
	 * Truncate overflowing cell content to a single line with an ellipsis, and
	 * show a tooltip with the full content on hover/focus when a cell is
	 * truncated. A column supersedes or disables that tooltip via
	 * {@link GridColumn.cellTooltip}. Set `false` to let cells wrap instead.
	 * @defaultValue true
	 */
	truncate?: boolean

	rowClassName?: (row: T) => string | undefined

	/**
	 * Invoked when a row is clicked, with the row datum and the originating
	 * event. A click that lands on interactive cell content — a button, link,
	 * input, or the selection checkbox — is ignored, so per-row controls keep
	 * working. A row with a handler is keyboard-focusable and activates on
	 * Enter / Space; place primary actions in an interactive cell rather than
	 * relying on the row click alone for the clearest screen-reader semantics.
	 */
	onRowClick?: GridRowClick<T>

	/**
	 * Human-readable name for a row; labels its selection checkbox
	 * ("Select {label}"). Falls back to the raw row key.
	 */
	rowLabel?: (row: T) => string

	/**
	 * Pins the header row while the body scrolls; forces a scroll wrapper around
	 * the table.
	 * @defaultValue false
	 */
	stickyHeader?: boolean
	maxHeight?: string

	/**
	 * Replaces the body with a loading skeleton and marks the table `aria-busy`.
	 * @defaultValue false
	 */
	loading?: boolean
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
	 * Pass `true` for defaults (44px row height, 10 overscan), or an object
	 * to tune. Assumes uniform row heights.
	 *
	 * Without virtualization every row in `rows` renders to the DOM; past
	 * ~500 rows initial render and column-state changes become slow. Enable
	 * virtualization at that scale.
	 */
	virtualize?: GridVirtualize

	/**
	 * Props spread onto the underlying `<table>` element. Use to attach a ref,
	 * keyboard handlers, or ARIA attributes (e.g. `role="grid"`) directly to
	 * the semantic element.
	 */
	tableProps?: TableElementProps

	/**
	 * Discriminant for the read-only grid. Set `editable` (see {@link GridProps})
	 * for the spreadsheet-style editing surface instead.
	 * @defaultValue false
	 */
	editable?: false
	className?: string
	children?: never
}
