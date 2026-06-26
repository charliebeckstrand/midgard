'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import type { TableElementProps, TableVariants } from '../../components/table'
import { Table } from '../../components/table'
import { Toolbar } from '../../components/toolbar'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/grid'
import { GridContext, type SortState } from './context'
import { GridBody } from './grid-body'
import { GridColumnManagerDialog } from './grid-column-manager-dialog'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './grid-constants'
import { GridEditable, type GridEditableProps } from './grid-editable'
import { GridHead } from './grid-head'
import { GridPagination as GridPaginationFooter } from './grid-pagination'
import { restrictToFirstScrollableAncestor, restrictToHorizontalAxis } from './grid-reorder'
import type { GridColumn, GridColumnManagerPreset, GridColumnSizing, GridPagination } from './types'
import { useGridColumns } from './use-grid-columns'
import { useGridReorder } from './use-grid-reorder'
import { useGridSelection } from './use-grid-selection'
import { useGridTable } from './use-grid-table'

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

/**
 * Row-virtualization setting: `true` for defaults, `false`/absent to disable,
 * or an object tuning `estimateSize` (row height, px) and `overscan`.
 *
 * @see {@link GridProps.virtualize}
 */
export type GridVirtualize = boolean | { estimateSize?: number; overscan?: number }

/** Controlled/uncontrolled sort binding for {@link GridProps.sort}. */
export type GridSort = {
	value?: SortState
	defaultValue?: SortState
	onValueChange?: (sort: SortState | undefined) => void
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

	/** Called when the manager's "save preset" action fires, with the current order and hidden ids. */
	onSavePreset?: (preset: GridColumnManagerPreset) => void
}

/**
 * Props for a read-only data {@link Grid}. `T` is the row datum type;
 * `columns` and the various renderers are keyed to it.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridDataProps<T> = TableVariants & {
	/** Column definitions, in declaration order; `columnOrder`, `reorder`, and the column manager can reorder and hide a subset. */
	columns: GridColumn<T>[]
	rows: T[]
	/** Derives a stable, unique key per row; backs selection, sort, and virtualization identity. */
	getKey: (row: T, index: number) => string | number

	sort?: GridSort
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
	 * Adds a drag handle to each reorderable column header — every visible,
	 * non-pinned data column — letting the user reorder columns by pointer or
	 * keyboard. Commits through `columnOrder`; `select`, `actions`, and `pinned`
	 * columns hold their position. No handles render until at least two columns
	 * are reorderable.
	 * @defaultValue false
	 */
	reorder?: boolean

	rowClassName?: (row: T) => string | undefined

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
 * Data-driven {@link Table} over a flat `rows` source: maps each row through
 * `columns`, sorts and selects by the key from `getKey`, and shares that state
 * with head and cells via {@link useGrid}/{@link useGridRow}. Sort,
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
	selection: selectionConfig,
	columnOrder: columnOrderConfig,
	columnManager: columnManagerConfig,
	pagination: paginationConfig,
	resizable = false,
	columnSizing: columnSizingConfig,
	reorder = false,
	rowClassName,
	rowLabel,
	stickyHeader = false,
	maxHeight,
	loading = false,
	rowLoading,
	empty,
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

	const [sort, setSort] = useControllable<SortState>({
		value: sortConfig?.value,
		defaultValue: sortConfig?.defaultValue,
		onValueChange: sortConfig?.onValueChange,
	})

	const batchActions = selectionConfig?.batchActions

	const {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		visibleColumns,
		reorderColumns,
		managerItems,
		manageColumns,
		manageColumnsLabel,
	} = useGridColumns<T>({ columns, columnOrderConfig, columnManagerConfig })

	// TanStack Table is the data engine: rows flow through its row model, which
	// also surfaces the pagination state and handlers the footer renders from.
	// When `pagination` is unset the model is bypassed and `renderRows === rows`.
	const { renderRows, pagination, resize } = useGridTable<T>({
		rows,
		columns,
		getKey,
		pagination: paginationConfig,
		resizable,
		columnSizing: columnSizingConfig,
	})

	const rowKeys = useMemo<(string | number)[]>(
		() => renderRows.map((row, i) => getKey(row, i)),
		[renderRows, getKey],
	)

	const { selection, setSelection, toggleRow, toggleAll, allSelected, someSelected } =
		useGridSelection({
			selectionConfig,
			rowKeys,
		})

	const toggleSort = useCallback(
		(column: string | number) => {
			setSort((prev) => {
				if (prev?.column === column) {
					return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
				}

				return { column, direction: 'asc' }
			})
		},
		[setSort],
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

	const tableContent = (
		<Table
			density={density}
			bleed={bleed}
			outline={outline}
			striped={striped}
			className={className}
			// `aria-busy` marks the table as updating while the loading skeleton
			// stands in for the body. Virtualization windows the DOM; these props
			// advertise the full extent: `role="grid"` (aria-rowindex is inert on
			// a plain `role="table"`), `aria-rowcount` (header + data rows), and
			// `aria-colcount`, with per-cell indices emitted by head/row.
			tableProps={{
				...tableProps,
				...(loading ? { 'aria-busy': true } : {}),
				...(virtualizeEnabled
					? {
							role: tableProps?.role ?? 'grid',
							'aria-rowcount': ariaRowCount,
							'aria-colcount': visibleColumns.length,
						}
					: {}),
			}}
		>
			<GridHead
				columns={visibleColumns}
				hasRows={renderRows.length > 0}
				virtualized={virtualizeEnabled}
				reorderable={canReorder}
				resize={resize}
			/>

			<GridBody<T>
				loading={loading}
				rows={renderRows}
				rowKeys={rowKeys}
				visibleColumns={visibleColumns}
				getKey={getKey}
				rowLoading={rowLoading}
				rowClassName={rowClassName}
				rowLabel={rowLabel}
				empty={empty}
				selection={selection}
				toggleRow={toggleRow}
				reorderable={canReorder}
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
			<div data-slot="grid" className={cn(k.wrapper)}>
				{manageColumns && (
					<GridColumnManagerDialog
						label={manageColumnsLabel}
						columns={managerItems}
						order={columnOrder}
						onOrderChange={setColumnOrder}
						hidden={hiddenColumns}
						onHiddenChange={setHiddenColumns}
						onSavePreset={columnManagerConfig?.onSavePreset}
					/>
				)}

				{batchActions && someSelected && (
					<Toolbar aria-label="Batch actions">{batchActions({ selection, setSelection })}</Toolbar>
				)}

				{canReorder ? (
					<DndContext
						{...dndContextProps}
						modifiers={REORDER_MODIFIERS}
						autoScroll={REORDER_AUTO_SCROLL}
					>
						<SortableContext items={itemIds} strategy={strategy}>
							{tableRegion}
						</SortableContext>
					</DndContext>
				) : (
					tableRegion
				)}

				{pagination && <GridPaginationFooter pagination={pagination} />}
			</div>
		</GridContext>
	)
}
