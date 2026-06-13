'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/data-table'
import type { TableElementProps, TableVariants } from '../table'
import { Table } from '../table'
import { Toolbar } from '../toolbar'
import { DataTableContext, type SortState } from './context'
import { DataTableBody } from './data-table-body'
import { DataTableColumnManagerDialog } from './data-table-column-manager-dialog'
import { DEFAULT_OVERSCAN, DEFAULT_ROW_HEIGHT } from './data-table-constants'
import { DataTableHead } from './data-table-head'
import type { DataTableColumn, DataTableColumnManagerPreset } from './types'
import { useDataTableColumns } from './use-data-table-columns'
import { useDataTableSelection } from './use-data-table-selection'

/**
 * Row-virtualization setting: `true` for defaults, `false`/absent to disable,
 * or an object tuning `estimateSize` (row height, px) and `overscan`.
 *
 * @see {@link DataTableProps.virtualize}
 */
export type DataTableVirtualize = boolean | { estimateSize?: number; overscan?: number }

/** Controlled/uncontrolled sort binding for {@link DataTableProps.sort}. */
export type DataTableSort = {
	value?: SortState
	defaultValue?: SortState
	onValueChange?: (sort: SortState | undefined) => void
}

/**
 * Controlled/uncontrolled row-selection binding for {@link DataTableProps.selection},
 * plus an optional batch-action bar shown while any row is selected.
 */
export type DataTableSelection = {
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
 * Column-manager binding for {@link DataTableProps.columnManager}: gates the
 * toolbar button and holds controlled/uncontrolled order and visibility state.
 */
export type DataTableColumnManagerConfig = {
	/** Render the toolbar button that opens the manage-columns dialog. */
	enabled?: boolean
	/** Label on the toolbar button (and dialog title). */
	label?: ReactNode

	order?: (string | number)[]
	defaultOrder?: (string | number)[]
	onOrderChange?: (order: (string | number)[]) => void

	hidden?: Set<string | number>
	defaultHidden?: Set<string | number>
	onHiddenChange?: (hidden: Set<string | number>) => void

	/** Called when the manager's "save preset" action fires, with the current order and hidden ids. */
	onSavePreset?: (preset: DataTableColumnManagerPreset) => void
}

/**
 * Props for {@link DataTable}. `T` is the row datum type; `columns` and the
 * various renderers are keyed to it.
 *
 * @typeParam T - Shape of a single row.
 */
export type DataTableProps<T> = TableVariants & {
	/** Column definitions, in declaration order; the column manager can reorder and hide a subset. */
	columns: DataTableColumn<T>[]
	rows: T[]
	/** Derives a stable, unique key per row; backs selection, sort, and virtualization identity. */
	getKey: (row: T, index: number) => string | number

	sort?: DataTableSort
	selection?: DataTableSelection
	columnManager?: DataTableColumnManagerConfig

	rowClassName?: (row: T) => string | undefined

	/**
	 * Human-readable name for a row; labels its selection checkbox
	 * ("Select {label}"). Falls back to the raw row key.
	 */
	rowLabel?: (row: T) => string

	stickyHeader?: boolean
	maxHeight?: string

	loading?: boolean
	rowLoading?: (row: T) => boolean

	/**
	 * Content shown in place of the body when `rows` is empty and `loading` is
	 * false. Defaults to a "No items" message.
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
	virtualize?: DataTableVirtualize

	/**
	 * Props spread onto the underlying `<table>` element. Use to attach a ref,
	 * keyboard handlers, or ARIA attributes (e.g. `role="grid"`) directly to
	 * the semantic element.
	 */
	tableProps?: TableElementProps

	className?: string
	children?: never
}

// Collapses the `virtualize` prop (boolean or options object) into resolved
// enabled flag and sizing.
function resolveVirtualization(virtualize: DataTableVirtualize | undefined): {
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
 * with head and cells via {@link useDataTable}/{@link useDataTableRow}. Sort and
 * selection are controllable; selecting rows surfaces a batch-action
 * {@link Toolbar}, and a column manager dialog reorders and hides columns.
 * Renders a loading skeleton (`aria-busy`), an `empty` slot when there are no
 * rows, a sticky header, and — under `virtualize` — windowed rows with full
 * `role="grid"` row/column counts.
 *
 * @remarks Client component. `virtualize` requires `maxHeight`; omitting it
 * throws, since virtualization needs a scroll container of known size.
 * @typeParam T - Shape of a single row.
 */
export function DataTable<T>({
	columns,
	rows,
	getKey,
	sort: sortConfig,
	selection: selectionConfig,
	columnManager: columnManagerConfig,
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
	grid,
	striped,
	className,
}: DataTableProps<T>) {
	if (virtualize && !maxHeight) {
		throw new Error(
			'<DataTable virtualize> requires `maxHeight` — virtualization needs a scroll container of known size.',
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
		managerItems,
		manageColumns,
		manageColumnsLabel,
	} = useDataTableColumns<T>({ columns, columnManagerConfig })

	const rowKeys = useMemo<(string | number)[]>(
		() => rows.map((row, i) => getKey(row, i)),
		[rows, getKey],
	)

	const { selection, setSelection, toggleRow, toggleAll, allSelected, someSelected } =
		useDataTableSelection({
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

	const scrollRef = useRef<HTMLDivElement>(null)

	const needsScrollWrapper = stickyHeader || virtualizeEnabled

	const tableContent = (
		<Table
			density={density}
			bleed={bleed}
			grid={grid}
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
							'aria-rowcount': rows.length + 1,
							'aria-colcount': visibleColumns.length,
						}
					: {}),
			}}
		>
			<DataTableHead
				columns={visibleColumns}
				hasRows={rows.length > 0}
				virtualized={virtualizeEnabled}
			/>

			<DataTableBody<T>
				loading={loading}
				rows={rows}
				rowKeys={rowKeys}
				visibleColumns={visibleColumns}
				getKey={getKey}
				rowLoading={rowLoading}
				rowClassName={rowClassName}
				rowLabel={rowLabel}
				empty={empty}
				selection={selection}
				toggleRow={toggleRow}
				virtualize={virtualizeEnabled ? { scrollRef, estimateSize, overscan } : null}
			/>
		</Table>
	)

	return (
		<DataTableContext value={context}>
			<div data-slot="data-table" className={cn(k.wrapper)}>
				{manageColumns && (
					<DataTableColumnManagerDialog
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
					<Toolbar aria-label="Batch actions">
						{someSelected && batchActions({ selection, setSelection })}
					</Toolbar>
				)}

				{needsScrollWrapper ? (
					<div
						ref={scrollRef}
						className={cn(k.sticky.wrapper)}
						style={maxHeight ? { maxHeight } : undefined}
					>
						{tableContent}
					</div>
				) : (
					tableContent
				)}
			</div>
		</DataTableContext>
	)
}
