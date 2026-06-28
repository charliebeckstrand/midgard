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
 * Export binding for {@link GridDataProps.exportable}: gates CSV export and
 * optionally surfaces a toolbar button alongside the header context-menu item.
 * The boolean shorthand `exportable={true}` enables export with the menu item
 * alone; the object form adds the toolbar button and tunes the label and
 * download filename. Mirrors {@link GridColumnManagerConfig}'s `enabled` /
 * `toolbarButton` / `label` shape, and the button joins the column manager's in
 * the grid's toolbar.
 */
export type GridExportConfig = {
	/**
	 * Whether CSV export is available: the "Export to CSV" header context-menu
	 * item and, with `toolbarButton`, the toolbar button. The boolean shorthand
	 * `exportable={true}` is this set to `true`.
	 * @defaultValue true
	 */
	enabled?: boolean
	/**
	 * Also render a button in the grid's toolbar that downloads the CSV, beside
	 * the column-manager trigger when present and alongside the context-menu item.
	 * Has no effect when `enabled` is `false`.
	 * @defaultValue false
	 */
	toolbarButton?: boolean
	/**
	 * Label on the toolbar button and the "Export to CSV" context-menu item.
	 * @defaultValue 'Export to CSV'
	 */
	label?: ReactNode
	/**
	 * Suggested filename for the CSV download.
	 * @defaultValue 'grid.csv'
	 */
	filename?: string
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
	 * TanStack Table engine. Each data column gains a resize handle on its trailing
	 * edge, spanning the column's full height — header through the last row — so a
	 * drag can begin anywhere down the column's right side, not just the header. The
	 * handle's grip is revealed on hover, keyboard focus, or active drag. A column's
	 * initial width comes from a `px` `width`, else a default, and widths persist
	 * through {@link GridDataProps.columnSizing}. Set `false` for fixed-width columns.
	 * @defaultValue true
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
	 * the column manager, rendering its dialog even without the toolbar button —
	 * unless {@link GridColumnManagerConfig.enabled} is `false`, which drops it.
	 *
	 * @see {@link GridContextMenu}
	 * @defaultValue `{ column: true, cell: true }`
	 */
	contextMenu?: GridContextMenuConfig<T> | false

	/**
	 * Enables CSV export of the grid's filtered and sorted rows (all pages). The
	 * shorthand `true` adds an "Export to CSV" item to the header context menu;
	 * pass a {@link GridExportConfig} to also surface a toolbar button and tune
	 * the label and filename. Each row reads a column's
	 * {@link GridColumn.value}, falling back to the row field named by the column
	 * id; columns without either export an empty field. Off by default so a grid
	 * doesn't expose a bulk download unless asked.
	 * @defaultValue false
	 */
	exportable?: boolean | GridExportConfig

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
	 * Adds a keyboard cell cursor over the data cells. The grid becomes a single
	 * tab stop (`role="grid"`) whose active cell moves with the arrow keys, Home/End
	 * (row edges), Ctrl/Cmd+Home/End (grid corners), and PageUp/PageDown, tracked
	 * for assistive tech through `aria-activedescendant` and ringed on screen.
	 * Enter/Space activates the active row's {@link GridDataProps.onRowClick};
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

	/** Extra class merged onto the underlying `<table>` element. */
	className?: string

	/** The grid renders from `columns`/`rows`, not JSX children. */
	children?: never
}
