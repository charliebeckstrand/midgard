'use client'

import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/data-table'
import type { TableElementProps, TableVariants } from '../table'
import { Table, TableBody, TableLoading } from '../table'
import { Toolbar } from '../toolbar'
import { DataTableProvider, type SortState } from './context'
import { DataTableManageColumnsDialog } from './data-table-column-manager'
import { DataTableHead } from './data-table-head'
import { DataTableRow } from './data-table-row'
import { DataTableVirtualizedBody } from './data-table-virtualized-body'
import type { DataTableColumn, DataTableColumnManagerPreset } from './types'
import { useDataTableColumns } from './use-data-table-columns'
import { useDataTableSelection } from './use-data-table-selection'

export type DataTableVirtualize = boolean | { estimateSize?: number; overscan?: number }

const DEFAULT_ROW_HEIGHT = 44
const DEFAULT_OVERSCAN = 10

export type DataTableSort = {
	value?: SortState
	defaultValue?: SortState
	onValueChange?: (sort: SortState | undefined) => void
}

export type DataTableSelection = {
	value?: Set<string | number>
	defaultValue?: Set<string | number>
	onValueChange?: (selection: Set<string | number> | undefined) => void
	batchActions?: (selection: Set<string | number>) => ReactNode
}

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

	onSavePreset?: (preset: DataTableColumnManagerPreset) => void
}

export type DataTableProps<T> = TableVariants & {
	columns: DataTableColumn<T>[]
	rows: T[]
	getRowKey: (row: T, index: number) => string | number

	sort?: DataTableSort
	selection?: DataTableSelection
	columnManager?: DataTableColumnManagerConfig

	rowClassName?: (row: T) => string | undefined

	stickyHeader?: boolean
	maxHeight?: string

	loading?: boolean
	rowLoading?: (row: T) => boolean

	/**
	 * Enables row virtualization via `@tanstack/react-virtual`. Only rows in
	 * the scroll viewport (plus overscan) render to the DOM. Requires
	 * `maxHeight` — virtualization needs a scroll container of known size.
	 *
	 * Pass `true` for defaults (44px row height, 10 overscan), or an object
	 * to tune. Assumes uniform row heights.
	 *
	 * Without virtualization every row in `rows` renders to the DOM; a few
	 * hundred rows are fine but past ~500 rows initial render and column-state
	 * changes become noticeably slow. Enable virtualization at that scale.
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

/** Sortable, selectable table over a flat row source — with optional row virtualization and a column manager. */
export function DataTable<T>({
	columns,
	rows,
	getRowKey,
	sort: sortConfig,
	selection: selectionConfig,
	columnManager: columnManagerConfig,
	rowClassName,
	stickyHeader = false,
	maxHeight,
	loading = false,
	rowLoading,
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

	const virtualizeEnabled = virtualize != null && virtualize !== false

	const virtOpts = typeof virtualize === 'object' ? virtualize : null

	const estimateSize = virtOpts?.estimateSize ?? DEFAULT_ROW_HEIGHT

	const overscan = virtOpts?.overscan ?? DEFAULT_OVERSCAN

	const [sort, setSort] = useControllable<SortState>({
		value: sortConfig?.value,
		defaultValue: sortConfig?.defaultValue,
		onChange: sortConfig?.onValueChange,
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
		() => rows.map((row, i) => getRowKey(row, i)),
		[rows, getRowKey],
	)

	const { selection, toggleRow, toggleAll, allSelected, someSelected } = useDataTableSelection({
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

	const ctx = useMemo(
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

	const renderBody = () => {
		if (loading) return <TableLoading columns={visibleColumns.length} />

		if (virtualizeEnabled) {
			return (
				<DataTableVirtualizedBody<T>
					scrollRef={scrollRef}
					rows={rows}
					rowKeys={rowKeys}
					visibleColumns={visibleColumns}
					rowLoading={rowLoading}
					rowClassName={rowClassName}
					estimateSize={estimateSize}
					overscan={overscan}
				/>
			)
		}

		return (
			<TableBody>
				{rows.map((row, index) => {
					const key = rowKeys[index] ?? getRowKey(row, index)

					return (
						<DataTableRow<T>
							key={key}
							row={row}
							rowKey={key}
							columns={visibleColumns}
							loading={rowLoading?.(row) ?? false}
							className={rowClassName?.(row)}
						/>
					)
				})}
			</TableBody>
		)
	}

	const tableContent = (
		<Table
			density={density}
			bleed={bleed}
			grid={grid}
			striped={striped}
			className={className}
			tableProps={tableProps}
		>
			<DataTableHead columns={visibleColumns} />

			{renderBody()}
		</Table>
	)

	return (
		<DataTableProvider value={ctx}>
			<div data-slot="data-table" className={cn(k.wrapper)}>
				{manageColumns && (
					<DataTableManageColumnsDialog
						label={manageColumnsLabel}
						columns={managerItems}
						order={columnOrder}
						onOrderChange={setColumnOrder}
						hidden={hiddenColumns}
						onHiddenChange={setHiddenColumns}
						onSavePreset={columnManagerConfig?.onSavePreset}
					/>
				)}

				{batchActions && <Toolbar>{someSelected && batchActions(selection)}</Toolbar>}

				{needsScrollWrapper ? (
					<div
						ref={scrollRef}
						className={cn(k.stickyWrapper)}
						style={maxHeight ? { maxHeight } : undefined}
					>
						{tableContent}
					</div>
				) : (
					tableContent
				)}
			</div>
		</DataTableProvider>
	)
}
