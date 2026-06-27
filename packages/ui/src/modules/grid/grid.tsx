'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ComponentProps, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { TableElementProps, TableVariants } from '../../components/table'
import { Table } from '../../components/table'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import type { DensityLevel } from '../../providers/density/context'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GridContext, type SortState } from './context'
import { GridBody } from './grid-body'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './grid-constants'
import { GridContextMenu } from './grid-context-menu'
import { GridEditable, type GridEditableProps } from './grid-editable'
import { downloadCsv, rowsToCsv } from './grid-export'
import { GridFilter } from './grid-filter'
import { GridHead } from './grid-head'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from './grid-reorder'
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
import { useGridColumns } from './use-grid-columns'
import { useGridReorder } from './use-grid-reorder'
import { useGridSelectionActions, useGridSelectionState } from './use-grid-selection'
import { type GridColumnResize, type GridPaginationView, useGridTable } from './use-grid-table'

/**
 * Locks column drags to the x-axis and bounds them to the scroll container, so
 * horizontal auto-scroll can reach off-screen columns without running away. @internal
 */
const REORDER_MODIFIERS = [restrictToHorizontalAxis, restrictToFirstScrollableAncestor]

/**
 * Column-drag auto-scroll: horizontal only — a wide table scrolls sideways to
 * reach off-screen columns (bounded by the scroll-ancestor modifier above) —
 * with the vertical axis off so a downward drag can't scroll the body. @internal
 */
const REORDER_AUTO_SCROLL = { threshold: { x: 0.2, y: 0 } }

/** Context menus are on by default (both header and cell); `contextMenu={false}` disables them. @internal */
const DEFAULT_CONTEXT_MENU = { column: true, cell: true } as const

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
	 * Right-click context menus: a `column` menu on headers (Sort Ascending /
	 * Descending, Auto-size columns, Choose Columns) and a `cell` menu on body
	 * cells (Copy). On by default; pass `false` to disable. Each side takes the
	 * defaults (`true`) or a builder that reshapes them. "Choose Columns" opens
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

/**
 * Props for {@link Grid}: a read-only data grid ({@link GridDataProps}) or, when
 * `editable` is set, a spreadsheet-style editing surface
 * ({@link GridEditableProps}). The `editable` discriminant selects the arm.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridProps<T> = GridDataProps<T> | (GridEditableProps<T> & { editable: true })

/** Props for {@link GridRegion}. @internal */
type GridRegionProps<T> = {
	canReorder: boolean
	dndContextProps: ComponentProps<typeof DndContext>
	itemIds: ComponentProps<typeof SortableContext>['items']
	strategy: ComponentProps<typeof SortableContext>['strategy']
	contextMenu: GridContextMenuConfig<T> | undefined
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	/** Active sort columns in priority order, so the header menu can offer "Clear sort" for a sorted column. */
	sort: SortState[]
	sortColumn: (column: string | number, direction: 'asc' | 'desc') => void
	clearSort: () => void
	/** Pins a column to an edge, or unpins it with `false`; backs the header menu's Pin items. */
	pinColumn: (column: string | number, side: PinSide | false) => void
	autoSizeColumns: (() => void) | null
	chooseColumns: (() => void) | null
	exportCsv: (() => void) | null
	children: ReactNode
}

/**
 * Wraps the table region in its interaction layers: the column-reorder dnd
 * context (when reorderable) nested inside the right-click context menu (when
 * configured). Split out of {@link GridData} so its body stays within the
 * cognitive-complexity budget.
 *
 * @internal
 */
function GridRegion<T>({
	canReorder,
	dndContextProps,
	itemIds,
	strategy,
	contextMenu,
	columns,
	rows,
	rowKeys,
	sort,
	sortColumn,
	clearSort,
	pinColumn,
	autoSizeColumns,
	chooseColumns,
	exportCsv,
	children,
}: GridRegionProps<T>) {
	const reordered = canReorder ? (
		<DndContext {...dndContextProps} modifiers={REORDER_MODIFIERS} autoScroll={REORDER_AUTO_SCROLL}>
			<SortableContext items={itemIds} strategy={strategy}>
				{children}
			</SortableContext>
		</DndContext>
	) : (
		children
	)

	if (!contextMenu) return reordered

	return (
		<GridContextMenu
			config={contextMenu}
			columns={columns}
			rows={rows}
			rowKeys={rowKeys}
			sort={sort}
			sortColumn={sortColumn}
			clearSort={clearSort}
			pinColumn={pinColumn}
			autoSizeColumns={autoSizeColumns}
			chooseColumns={chooseColumns}
			exportCsv={exportCsv}
		>
			{reordered}
		</GridContextMenu>
	)
}

/** A column's frozen edge once normalized (`true` collapses to `'left'`). @internal */
type PinSide = 'left' | 'right'

/**
 * Runtime pin changes keyed by column id, layered over the static
 * {@link GridColumn.pinned} flags: a side pins the column, `'none'` unpins a
 * statically-pinned one. The header menu writes here so a column can be frozen
 * or released without touching the column definitions.
 *
 * @internal
 */
type PinOverrides = Map<string | number, PinSide | 'none'>

/**
 * Overlays the menu's {@link PinOverrides} onto each column's static `pinned`
 * flag, cloning only the columns an override touches — and returning the input
 * array untouched when there are none — so unrelated columns keep their identity
 * (and the downstream `visibleColumns` reference reuse holds).
 *
 * @internal
 */
function applyPinOverrides<T>(columns: GridColumn<T>[], overrides: PinOverrides): GridColumn<T>[] {
	if (overrides.size === 0) return columns

	return columns.map((col) => {
		const override = overrides.get(col.id)

		if (override === undefined) return col

		return { ...col, pinned: override === 'none' ? undefined : override }
	})
}

/** Stable empty sort default; the unsorted state, read-only and replaced wholesale. @internal */
const EMPTY_SORT: SortState[] = []

/**
 * Next sort list after cycling `column`. A Shift-click (`additive`) folds the
 * column into the existing sort, preserving the others and their priority order:
 * appending it ascending, flipping it to descending, then dropping it. A plain
 * click collapses the sort to this column alone, cycling ascending → descending →
 * unsorted (so a lone sorted column clears on its third click).
 *
 * @internal
 */
function nextSort(current: SortState[], column: string | number, additive: boolean): SortState[] {
	const existing = current.find((entry) => entry.column === column)

	if (additive) {
		if (!existing) return [...current, { column, direction: 'asc' }]

		if (existing.direction === 'asc') {
			return current.map((entry) =>
				entry.column === column ? { column, direction: 'desc' } : entry,
			)
		}

		return current.filter((entry) => entry.column !== column)
	}

	// Tri-state only when this column is already the sole sort; otherwise a plain
	// click on any other (or additional) column resets to just this one, ascending.
	if (current.length === 1 && existing) {
		return existing.direction === 'asc' ? [{ column, direction: 'desc' }] : EMPTY_SORT
	}

	return [{ column, direction: 'asc' }]
}

/**
 * Owns the grid's controllable sort: the resolved ordered list (never
 * `undefined` — an empty list is unsorted), the raw setter the engine and header
 * menu write through, and `toggleSort`, which cycles a column's sort via
 * {@link nextSort} (Shift-click folds it into the existing sort).
 *
 * @internal
 */
function useGridSort(config: GridSort | undefined): {
	sort: SortState[]
	setSort: (sort: SortState[]) => void
	toggleSort: (column: string | number, additive: boolean) => void
} {
	const [sortState, setSortState] = useControllable<SortState[]>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SORT,
		// The list is never meaningfully `undefined`; coalesce so the public callback
		// keeps its non-nullable shape (an empty list is the unsorted state).
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SORT),
	})

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSortState((prev) => nextSort(prev ?? EMPTY_SORT, column, additive)),
		[setSortState],
	)

	return { sort: sortState ?? EMPTY_SORT, setSort: setSortState, toggleSort }
}

/**
 * Applies the grid-level `sortable` default to data columns that don't declare
 * their own: an undefined {@link GridColumn.sortable} inherits `defaultSortable`,
 * while an explicit value (and every non-data column) is left untouched.
 *
 * @internal
 */
function resolveSortable<T>(columns: GridColumn<T>[], defaultSortable: boolean): GridColumn<T>[] {
	return columns.map((col) =>
		isDataColumn(col) && col.sortable === undefined ? { ...col, sortable: defaultSortable } : col,
	)
}

/**
 * Collapses the `virtualize` prop (boolean or options object) into a resolved
 * enabled flag and sizing.
 *
 * @internal
 */
function resolveVirtualization(virtualize: GridVirtualize | undefined): {
	enabled: boolean
	estimateSize: number
	overscan: number
} {
	const enabled = virtualize != null && virtualize !== false

	const opts = typeof virtualize === 'object' ? virtualize : null

	return {
		enabled,
		estimateSize: opts?.estimateSize ?? DEFAULT_ROW_HEIGHT,
		overscan: opts?.overscan ?? DEFAULT_OVERSCAN,
	}
}

/**
 * Assembles the `<table>` element props: the caller's `tableProps`, `aria-busy`
 * while loading, and — when the rendered body is a window onto a larger set
 * (`gridSemantics`: virtualization or pagination) — `role="grid"` with the full
 * row/column counts (per-cell indices come from head/row).
 *
 * @internal
 */
function resolveTableProps(args: {
	tableProps: TableElementProps | undefined
	loading: boolean
	gridSemantics: boolean
	ariaRowCount: number
	colCount: number
	/** Fixed-layout table width (px) when resizable, sized to the `<colgroup>`. */
	tableWidth: number | undefined
}): TableElementProps {
	return {
		...args.tableProps,
		...(args.loading ? { 'aria-busy': true } : {}),
		...(args.tableWidth != null
			? { style: { ...args.tableProps?.style, width: args.tableWidth } }
			: {}),
		...(args.gridSemantics
			? {
					role: args.tableProps?.role ?? 'grid',
					'aria-rowcount': args.ariaRowCount,
					'aria-colcount': args.colCount,
				}
			: {}),
	}
}

/**
 * Fixed-layout pieces for a resizable grid: the `<colgroup>` of exact widths,
 * the `table-fixed` + trailing-padding class, and the total table width — so a
 * resize touches only its own column. Inert (no colgroup, no width) when the
 * grid is not resizable. Split out of {@link GridData} for its
 * cognitive-complexity budget.
 *
 * @internal
 */
function resolveResizeLayout<T>(args: {
	resizable: boolean
	resize: GridColumnResize | null
	columns: GridColumn<T>[]
	density: DensityLevel | undefined
	className: string | undefined
}): { colGroup: ReactNode; tableClassName: string; tableWidth: number | undefined } {
	const { resize } = args

	if (!args.resizable || !resize) {
		return { colGroup: null, tableClassName: cn(args.className), tableWidth: undefined }
	}

	return {
		colGroup: (
			<colgroup>
				{args.columns.map((col) => (
					<col key={col.id} style={{ width: resize.getSize(col.id) }} />
				))}
			</colgroup>
		),
		tableClassName: cn(k.resize.fixed, k.resize.padding({ density: args.density }), args.className),
		tableWidth: resize.totalSize(),
	}
}

/** Resolved grid-semantics for the rendered window: the role/index gate, the global row offset, and the select-all label. @internal */
type GridSemantics = { enabled: boolean; rowOffset: number; selectAllLabel: string }

/**
 * Derives grid semantics from the rendered-window mode. The body is a window
 * onto a larger set under virtualization (DOM windowing) or pagination (one page
 * of many): both need `role="grid"`, `aria-rowcount`, and a page-/window-aware
 * global row offset so assistive tech reports position in the full set. Under
 * pagination the select-all checkbox toggles only the current page, so its label
 * says so rather than overclaiming "all rows". A plain table conveys all this
 * natively and stays a table.
 *
 * @internal
 */
function resolveGridSemantics(
	virtualizeEnabled: boolean,
	pagination: GridPaginationView | null,
): GridSemantics {
	return {
		enabled: virtualizeEnabled || pagination != null,
		rowOffset: pagination ? pagination.pageIndex * pagination.pageSize : 0,
		selectAllLabel: pagination ? 'Select all rows on this page' : 'Select all rows',
	}
}

/**
 * Stabilizes an `onRowClick` callback so the memoized rows hold across renders:
 * returns a referentially-stable handler (or `undefined` when no callback is
 * set) that reads the live callback through a ref, so an inline consumer
 * callback doesn't churn every row.
 *
 * @internal
 */
function useStableRowClick<T>(
	onRowClick: GridRowClick<T> | undefined,
): GridRowClick<T> | undefined {
	const ref = useRef(onRowClick)

	ref.current = onRowClick

	const hasRowClick = onRowClick != null

	return useMemo(
		() => (hasRowClick ? (row: T, event) => ref.current?.(row, event) : undefined),
		[hasRowClick],
	)
}

/**
 * Data-driven {@link Table} over a flat `rows` source: maps each row through
 * `columns`, keys each row for selection and identity via `getKey`, sorts by
 * column value on the engine, and shares that state with head and cells via
 * {@link useGrid}/{@link useGridRow}. Sort,
 * selection, and `columnOrder` are controllable; selecting rows surfaces a
 * batch-action {@link Toolbar}, a column manager dialog reorders and hides
 * columns, and `reorder` adds header drag handles for in-place column
 * reordering. Renders a loading skeleton (`aria-busy`), an `empty` slot when
 * there are no rows, a sticky header, and — under `virtualize` — windowed rows
 * with full `role="grid"` row/column counts.
 *
 * @remarks Client component. `virtualize` requires `maxHeight`; omitting it
 * throws, since virtualization needs a scroll container of known size.
 * @typeParam T - Shape of a single row.
 */
export function Grid<T>(props: GridProps<T>) {
	return props.editable ? <GridEditable<T> {...props} /> : <GridData<T> {...props} />
}

/**
 * Lifts the column-manager dialog's open state and derives the header
 * context-menu actions (sort a column, open the manager). Split out of
 * {@link GridData} so its body stays within the cognitive-complexity budget.
 *
 * @internal
 */
function useGridMenuActions<T>({
	manageColumns,
	contextMenu,
	columnManagerConfig,
	resize,
	setSort,
	hasData,
}: {
	manageColumns: boolean
	contextMenu: GridContextMenuConfig<T> | false | undefined
	columnManagerConfig: GridColumnManagerConfig | undefined
	resize: GridColumnResize | null
	setSort: (sort: SortState[]) => void
	/** Right-click menus stand down with no source data (its items act on rows). */
	hasData: boolean
}) {
	// Context menus are on by default (`false` opts out), but never without data.
	const configured = contextMenu === false ? undefined : (contextMenu ?? DEFAULT_CONTEXT_MENU)

	const menu = hasData ? configured : undefined

	// The dialog renders when the manager is enabled, or when a column menu can
	// reach it ("Choose Columns").
	const showColumnManager = manageColumns || Boolean(menu?.column)

	const [open, setOpen] = useControllable<boolean>({
		value: columnManagerConfig?.open,
		defaultValue: columnManagerConfig?.defaultOpen ?? false,
		onValueChange: (next) => columnManagerConfig?.onOpenChange?.(next ?? false),
	})

	// The menu sets a single-column sort, replacing any multi-column sort; Clear
	// sort empties it. (Multi-column sorting is the header Shift-click path.)
	const sortColumn = useCallback(
		(column: string | number, direction: 'asc' | 'desc') => setSort([{ column, direction }]),
		[setSort],
	)

	const clearSort = useCallback(() => setSort([]), [setSort])

	const chooseColumns = useMemo(
		() => (showColumnManager ? () => setOpen(true) : null),
		[showColumnManager, setOpen],
	)

	return {
		contextMenu: menu,
		showColumnManager,
		columnManagerOpen: open ?? false,
		setColumnManagerOpen: setOpen,
		sortColumn,
		clearSort,
		// Header "Auto-size columns" — only when resizing is on.
		autoSizeColumns: resize?.sizeToFit ?? null,
		chooseColumns,
	}
}

/**
 * The read-only data-grid implementation behind {@link Grid}. Kept a separate
 * component so the public dispatcher calls no hooks ahead of its `editable`
 * branch (the rules of hooks forbid a conditional early return over them).
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
function GridData<T>({
	columns,
	rows,
	getKey,
	sort: sortConfig,
	sortable = true,
	selection: selectionConfig,
	columnOrder: columnOrderConfig,
	columnManager: columnManagerConfig,
	pagination: paginationConfig,
	resizable = false,
	columnSizing: columnSizingConfig,
	search: searchConfig,
	columnFilters: columnFiltersConfig,
	contextMenu,
	exportable = false,
	reorder = false,
	truncate = true,
	rowClassName,
	onRowClick,
	rowLabel,
	stickyHeader = false,
	maxHeight,
	loading = false,
	rowLoading,
	empty,
	error,
	virtualize,
	tableProps,
	density,
	bleed,
	outline,
	striped,
	className,
}: GridDataProps<T>) {
	if (virtualize && !maxHeight) {
		throw new Error(
			'<Grid virtualize> requires `maxHeight` — virtualization needs a scroll container of known size.',
		)
	}

	const { enabled: virtualizeEnabled, estimateSize, overscan } = resolveVirtualization(virtualize)

	// Columns sort by default; bake the grid-level default into each data column
	// that doesn't set its own, so head and engine read one resolved flag.
	const resolvedColumns = useMemo(() => resolveSortable(columns, sortable), [columns, sortable])

	// Menu-applied pin changes, layered over the static `pinned` flags. Folding
	// them into the columns here lets the column and engine hooks read one
	// `pinned` flag whether it came from the definition or the menu.
	const [pinOverrides, setPinOverrides] = useState<PinOverrides>(() => new Map())

	const pinnedColumns = useMemo(
		() => applyPinOverrides(resolvedColumns, pinOverrides),
		[resolvedColumns, pinOverrides],
	)

	const pinColumn = useCallback((id: string | number, side: PinSide | false) => {
		setPinOverrides((prev) => {
			const next = new Map(prev)

			next.set(id, side === false ? 'none' : side)

			return next
		})
	}, [])

	const { sort, setSort, toggleSort } = useGridSort(sortConfig)

	// Selection state lives above the engine so the table can mirror it into its
	// own `state.rowSelection`; the row-derived flags and toggles come after the
	// engine produces `rowKeys` (see `useGridSelectionActions` below).
	const { selection, setSelection } = useGridSelectionState(selectionConfig)

	const batchActions = selectionConfig?.batchActions

	const {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		columnVisibility,
		reorderColumns,
		managerItems,
		manageColumns,
		manageColumnsLabel,
	} = useGridColumns<T>({ columns: pinnedColumns, columnOrderConfig, columnManagerConfig })

	// TanStack Table is the data engine: rows flow through its row model, which
	// also surfaces the pagination state and handlers the footer renders from.
	// When `pagination` is unset the model is bypassed and `renderRows === rows`.
	// Measured to auto-size resizable columns to fill the available width.
	const wrapperRef = useRef<HTMLDivElement>(null)

	const { table, visibleColumns, renderRows, pagination, resize, globalFilter, filters, pinning } =
		useGridTable<T>({
			rows,
			// The engine receives the full column set and resolves which render (and
			// in what order) from the order / visibility / pinning state below;
			// `visibleColumns` comes back in that resolved order for the header and body.
			columns: pinnedColumns,
			getKey,
			selection,
			columnOrder,
			columnVisibility,
			sort,
			setSort,
			sortManual: sortConfig?.manual ?? false,
			pagination: paginationConfig,
			resizable,
			columnSizing: columnSizingConfig,
			globalFilter: searchConfig,
			columnFilters: columnFiltersConfig,
			containerRef: wrapperRef,
		})

	const rowKeys = useMemo<(string | number)[]>(
		() => renderRows.map((row, i) => getKey(row, i)),
		[renderRows, getKey],
	)

	// Visible rows drive the select-all checkbox.
	const hasRows = renderRows.length > 0

	// Column interactions stand down only when there's no *source* data to act on
	// (incl. while loading) — not when a filter or search empties the view, where
	// the header must stay live so the user can clear it and recover the rows.
	const hasData = rows.length > 0

	const { toggleRow, toggleAll, allSelected, someSelected } = useGridSelectionActions({
		selection,
		setSelection,
		rowKeys,
	})

	// Export the filtered + sorted rows (all pages) to a CSV download. The engine's
	// sorted row model reflects active filters and sort; `null` keeps the menu item
	// out unless `exportable` is set.
	const exportCsv = useMemo(
		() =>
			exportable
				? () =>
						downloadCsv(
							'grid.csv',
							rowsToCsv(
								visibleColumns,
								table.getSortedRowModel().rows.map((modelRow) => modelRow.original),
							),
						)
				: null,
		[exportable, visibleColumns, table],
	)

	const context = useMemo(
		() => ({
			selection,
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			sort,
			toggleSort,
			stickyHeader,
		}),
		[selection, toggleRow, toggleAll, allSelected, someSelected, sort, toggleSort, stickyHeader],
	)

	// Lift the column-manager dialog's open state, resolve the (default-on)
	// context menus, and derive the header-menu actions; see `useGridMenuActions`.
	const {
		contextMenu: resolvedContextMenu,
		showColumnManager,
		columnManagerOpen,
		setColumnManagerOpen,
		sortColumn,
		clearSort,
		autoSizeColumns,
		chooseColumns,
	} = useGridMenuActions<T>({
		manageColumns,
		contextMenu,
		columnManagerConfig,
		resize,
		setSort,
		hasData,
	})

	// Column reorder rides @dnd-kit's horizontal sortable; the dnd context wraps
	// the whole table region (see `useGridReorder`), and the header reads
	// `canReorder` to register each draggable cell against it.
	const { canReorder, itemIds, strategy, dndContextProps } = useGridReorder<T>({
		reorder,
		visibleColumns,
		reorderColumns,
	})

	const scrollRef = useRef<HTMLDivElement>(null)

	const needsScrollWrapper = stickyHeader || virtualizeEnabled

	// Full row extent for grid semantics: the server total when paginating, else
	// the rendered count (which equals every row when unpaginated).
	const ariaRowCount = (pagination?.rowCount ?? renderRows.length) + 1

	// Grid semantics (role="grid" + global indices) and the select-all label,
	// derived together from the rendered-window mode; see `resolveGridSemantics`.
	const {
		enabled: gridSemantics,
		rowOffset: pageRowOffset,
		selectAllLabel,
	} = resolveGridSemantics(virtualizeEnabled, pagination)

	// A stable click handler so the memoized rows don't churn when the consumer
	// passes an inline `onRowClick`.
	const handleRowClick = useStableRowClick(onRowClick)

	const reorderActive = canReorder && hasData

	// Fixed-layout column widths so a resize touches only its own column.
	const { colGroup, tableClassName, tableWidth } = resolveResizeLayout({
		resizable,
		resize,
		columns: visibleColumns,
		density,
		className,
	})

	const tableContent = (
		<Table
			density={density}
			bleed={bleed}
			outline={outline}
			striped={striped}
			className={tableClassName}
			tableProps={resolveTableProps({
				tableProps,
				loading,
				gridSemantics,
				ariaRowCount,
				colCount: visibleColumns.length,
				tableWidth,
			})}
		>
			{colGroup}

			<GridHead
				columns={visibleColumns}
				hasRows={hasRows}
				interactive={hasData}
				selectAllLabel={selectAllLabel}
				gridSemantics={gridSemantics}
				reorderable={reorderActive}
				resize={resize}
				filters={filters}
				pinning={pinning}
			/>

			<GridBody<T>
				loading={loading}
				table={table}
				rows={renderRows}
				rowKeys={rowKeys}
				visibleColumns={visibleColumns}
				rowLoading={rowLoading}
				rowClassName={rowClassName}
				onRowClick={handleRowClick}
				rowLabel={rowLabel}
				empty={empty}
				error={error}
				gridSemantics={gridSemantics}
				rowIndexOffset={pageRowOffset}
				selection={selection}
				toggleRow={toggleRow}
				reorderable={reorderActive}
				truncate={truncate}
				pinning={pinning}
				virtualize={virtualizeEnabled ? { scrollRef, estimateSize, overscan } : null}
			/>
		</Table>
	)

	const tableRegion = needsScrollWrapper ? (
		<div
			ref={scrollRef}
			className={cn(k.sticky.wrapper)}
			style={maxHeight ? { maxHeight } : undefined}
		>
			{tableContent}
		</div>
	) : (
		tableContent
	)

	return (
		<GridContext value={context}>
			<div ref={wrapperRef} data-slot="grid" className={cn(k.wrapper)}>
				{showColumnManager && (
					<GridColumnManagerDialog
						enabled={manageColumns}
						open={columnManagerOpen ?? false}
						onOpenChange={setColumnManagerOpen}
						label={manageColumnsLabel}
						columns={managerItems}
						order={columnOrder}
						onOrderChange={setColumnOrder}
						hidden={hiddenColumns}
						onHiddenChange={setHiddenColumns}
						onSavePreset={columnManagerConfig?.onSavePreset}
					/>
				)}

				{globalFilter && <GridFilter filter={globalFilter} />}

				{batchActions && someSelected && (
					<Toolbar aria-label="Batch actions">{batchActions({ selection, setSelection })}</Toolbar>
				)}

				<GridRegion
					canReorder={reorderActive}
					dndContextProps={dndContextProps}
					itemIds={itemIds}
					strategy={strategy}
					contextMenu={resolvedContextMenu}
					columns={visibleColumns}
					rows={renderRows}
					rowKeys={rowKeys}
					sort={sort}
					sortColumn={sortColumn}
					clearSort={clearSort}
					pinColumn={pinColumn}
					autoSizeColumns={autoSizeColumns}
					chooseColumns={chooseColumns}
					exportCsv={exportCsv}
				>
					{tableRegion}
				</GridRegion>

				{pagination && <GridPaginationFooter pagination={pagination} />}
			</div>
		</GridContext>
	)
}
