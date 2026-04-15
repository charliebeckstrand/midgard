'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Minus } from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { Spinner } from '../spinner'
import type { TableVariants } from '../table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import {
	DataTableProvider,
	type DataTableRowContextValue,
	DataTableRowProvider,
	type SortState,
	useDataTable,
} from './context'
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
				<tbody>
					<tr>
						<td colSpan={columns.length} className={cn(k.loadingBody)}>
							<Spinner size="lg" />
						</td>
					</tr>
				</tbody>
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
				{someSelected && batchActions && (
					<DataTableBatchBar count={selection.size}>{batchActions(selection)}</DataTableBatchBar>
				)}

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

// ── Head ────────────────────────────────────────────────

type DataTableHeadProps<T> = {
	columns: DataTableColumn<T>[]
}

function DataTableHead<T>({ columns }: DataTableHeadProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useDataTable()

	return (
		<TableHead>
			<TableRow>
				{columns.map((col) => {
					if (col.selectable) {
						return (
							<TableHeader
								key={col.id}
								className={cn(k.selectCell, stickyHeader && k.stickyHead, col.headerClassName)}
								style={col.width ? { width: col.width } : undefined}
							>
								<Checkbox
									checked={allSelected || someSelected}
									onChange={toggleAll}
									icon={
										someSelected && !allSelected ? (
											<Minus
												data-slot="checkbox-check"
												aria-hidden="true"
												className="pointer-events-none absolute size-3.5 stroke-(--checkbox-check) opacity-0"
												strokeWidth={2}
											/>
										) : undefined
									}
									aria-label="Select all rows"
									aria-checked={someSelected && !allSelected ? 'mixed' : undefined}
								/>
							</TableHeader>
						)
					}

					const isSorted = sort?.column === col.id

					return (
						<TableHeader
							key={col.id}
							className={cn(stickyHeader && k.stickyHead, col.headerClassName)}
							style={col.width ? { width: col.width } : undefined}
						>
							{col.sortable ? (
								<button
									type="button"
									className={cn(k.sortButton)}
									onClick={() => toggleSort(col.id)}
									aria-label={`Sort by ${typeof col.title === 'string' ? col.title : col.id}`}
								>
									{col.title}
									<Icon
										icon={
											isSorted ? (
												sort.direction === 'asc' ? (
													<ArrowUp />
												) : (
													<ArrowDown />
												)
											) : (
												<ArrowUpDown />
											)
										}
										className={cn(isSorted ? k.sortIconActive : k.sortIcon)}
									/>
								</button>
							) : (
								col.title
							)}
						</TableHeader>
					)
				})}
			</TableRow>
		</TableHead>
	)
}

// ── Row ─────────────────────────────────────────────────

type DataTableRowInternalProps<T> = {
	row: T
	rowKey: string | number
	columns: DataTableColumn<T>[]
	loading: boolean
	className: string | undefined
}

function DataTableRowInternal<T>({
	row,
	rowKey,
	columns,
	loading,
	className,
}: DataTableRowInternalProps<T>) {
	const { selection, toggleRow } = useDataTable()
	const selected = selection.has(rowKey)

	const rowCtx = useMemo<DataTableRowContextValue<T>>(
		() => ({ row, rowKey, selected, loading }),
		[row, rowKey, selected, loading],
	)

	return (
		<DataTableRowProvider value={rowCtx as DataTableRowContextValue}>
			<TableRow
				data-selected={selected || undefined}
				className={cn(loading && k.rowLoading, className)}
			>
				{columns.map((col) => {
					if (col.selectable) {
						return (
							<TableCell key={col.id} className={cn(k.selectCell, col.className)}>
								<Checkbox
									checked={selected}
									onChange={() => toggleRow(rowKey)}
									aria-label={`Select row ${rowKey}`}
								/>
							</TableCell>
						)
					}

					if (col.actions) {
						return (
							<TableCell key={col.id} className={cn(k.actionsCell, col.className)}>
								{col.actions(row)}
							</TableCell>
						)
					}

					return (
						<TableCell key={col.id} className={cn(col.className)}>
							{col.cell ? col.cell(row) : null}
						</TableCell>
					)
				})}
			</TableRow>
		</DataTableRowProvider>
	)
}

// ── Batch bar ───────────────────────────────────────────

type DataTableBatchBarProps = {
	count: number
	children: ReactNode
}

function DataTableBatchBar({ count, children }: DataTableBatchBarProps) {
	return (
		<div data-slot="data-table-batch-bar" className={cn(k.batchBar)}>
			<span className={cn(k.batchCount)}>{count} selected</span>
			{children}
		</div>
	)
}
