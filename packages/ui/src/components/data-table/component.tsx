'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import type { TableVariants } from '../table'
import { Table, TableBody, TableLoading } from '../table'
import { Toolbar } from '../toolbar'
import { DataTableProvider, type SortState } from './context'
import { DataTableHead } from './head'
import { DataTableRowInternal } from './row'
import { k } from './variants'

// ── Column definition ───────────────────────────────────

export type DataTableColumn<T> = {
	id: string | number
	title?: ReactNode
	sortable?: boolean
	selectable?: boolean
	actions?: (row: T) => ReactNode
	cell?: (row: T) => ReactNode
	className?: string
	headerClassName?: string
	width?: string
}

// ── DataTable ───────────────────────────────────────────

export type DataTableProps<T> = TableVariants & {
	columns: DataTableColumn<T>[]
	rows: T[]
	getRowKey: (row: T, index: number) => string | number

	sort?: SortState
	defaultSort?: SortState
	onSortChange?: (sort: SortState | undefined) => void

	selection?: Set<string | number>
	defaultSelection?: Set<string | number>
	onSelectionChange?: (selection: Set<string | number> | undefined) => void

	batchActions?: (selection: Set<string | number>) => ReactNode

	rowClassName?: (row: T) => string | undefined

	stickyHeader?: boolean
	maxHeight?: string

	loading?: boolean
	rowLoading?: (row: T) => boolean

	className?: string
	children?: never
}

export function DataTable<T>({
	columns,
	rows,
	getRowKey,
	sort: sortProp,
	defaultSort,
	onSortChange,
	selection: selectionProp,
	defaultSelection,
	onSelectionChange,
	batchActions,
	rowClassName,
	stickyHeader = false,
	maxHeight,
	loading = false,
	rowLoading,
	dense,
	bleed,
	grid,
	striped,
	className,
}: DataTableProps<T>) {
	const [sort, setSort] = useControllable<SortState>({
		value: sortProp,
		defaultValue: defaultSort,
		onChange: onSortChange,
	})

	const [selectionRaw, setSelectionRaw] = useControllable<Set<string | number>>({
		value: selectionProp,
		defaultValue: defaultSelection ?? new Set(),
		onChange: onSelectionChange,
	})

	const selection = selectionRaw ?? new Set<string | number>()

	const rowKeys = useMemo<(string | number)[]>(
		() => rows.map((row, i) => getRowKey(row, i)),
		[rows, getRowKey],
	)

	const allSelected =
		rowKeys.length > 0 && rowKeys.every((rk: string | number) => selection.has(rk))

	const someSelected = rowKeys.some((rk: string | number) => selection.has(rk))

	const toggleRow = useCallback(
		(key: string | number) => {
			const next = new Set(selection)

			if (next.has(key)) {
				next.delete(key)
			} else {
				next.add(key)
			}

			setSelectionRaw(next)
		},
		[selection, setSelectionRaw],
	)

	const toggleAll = useCallback(() => {
		if (allSelected) {
			setSelectionRaw(new Set())
		} else {
			setSelectionRaw(new Set(rowKeys))
		}
	}, [allSelected, rowKeys, setSelectionRaw])

	const toggleSort = useCallback(
		(column: string | number) => {
			if (sort?.column === column) {
				setSort({
					column,
					direction: sort.direction === 'asc' ? 'desc' : 'asc',
				})
			} else {
				setSort({ column, direction: 'asc' })
			}
		},
		[sort, setSort],
	)

	const ctx = useMemo(
		() => ({
			selection,
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			rowCount: rows.length,
			sort,
			toggleSort,
			stickyHeader,
		}),
		[
			selection,
			toggleRow,
			toggleAll,
			allSelected,
			someSelected,
			rows.length,
			sort,
			toggleSort,
			stickyHeader,
		],
	)

	const tableContent = (
		<Table dense={dense} bleed={bleed} grid={grid} striped={striped} className={className}>
			<DataTableHead columns={columns} />

			{loading ? (
				<TableLoading columns={columns.length} />
			) : (
				<TableBody>
					{rows.map((row, index) => {
						const key = rowKeys[index] as string | number

						const isLoading = rowLoading?.(row) ?? false

						return (
							<DataTableRowInternal<T>
								key={key}
								row={row}
								rowKey={key}
								columns={columns}
								loading={isLoading}
								className={rowClassName?.(row)}
							/>
						)
					})}
				</TableBody>
			)}
		</Table>
	)

	return (
		<DataTableProvider value={ctx}>
			<div data-slot="data-table" className={cn(k.wrapper)}>
				{batchActions && <Toolbar>{someSelected && batchActions(selection)}</Toolbar>}

				{stickyHeader ? (
					<div className={cn(k.stickyWrapper)} style={maxHeight ? { maxHeight } : undefined}>
						{tableContent}
					</div>
				) : (
					tableContent
				)}
			</div>
		</DataTableProvider>
	)
}
