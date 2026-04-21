'use client'

import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Button } from '../button'
import { ColumnManager, type ColumnManagerItem, type ColumnManagerPreset } from '../column-manager'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../dialog'
import { Icon } from '../icon'
import type { TableVariants } from '../table'
import { Table, TableBody, TableLoading } from '../table'
import { Toolbar } from '../toolbar'
import { DataTableProvider, type SortState } from './context'
import { DataTableHead } from './head'
import { DataTableRowInternal } from './row'
import { k } from './variants'

export type { ColumnManagerPreset } from '../column-manager'

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
	/** Shown in the column manager but cannot be reordered or hidden. */
	pinned?: boolean
	/** When false, the column cannot be hidden from the column manager. Defaults to true. */
	hideable?: boolean
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

	/** When true, shows a button that opens a dialog for managing column order and visibility. */
	manageColumns?: boolean
	manageColumnsLabel?: ReactNode

	columnOrder?: (string | number)[]
	defaultColumnOrder?: (string | number)[]
	onColumnOrderChange?: (order: (string | number)[]) => void

	hiddenColumns?: Set<string | number>
	defaultHiddenColumns?: Set<string | number>
	onHiddenColumnsChange?: (hidden: Set<string | number>) => void

	onSavePreset?: (preset: ColumnManagerPreset) => void

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
	manageColumns = false,
	manageColumnsLabel = 'Columns',
	columnOrder: columnOrderProp,
	defaultColumnOrder,
	onColumnOrderChange,
	hiddenColumns: hiddenColumnsProp,
	defaultHiddenColumns,
	onHiddenColumnsChange,
	onSavePreset,
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

	const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [columnOrder = defaultOrder, setColumnOrder] = useControllable<(string | number)[]>({
		value: columnOrderProp,
		defaultValue: defaultColumnOrder ?? defaultOrder,
		onChange: (next) => onColumnOrderChange?.(next ?? []),
	})

	const [hiddenColumns = defaultHiddenColumns ?? new Set<string | number>(), setHiddenColumns] =
		useControllable<Set<string | number>>({
			value: hiddenColumnsProp,
			defaultValue: defaultHiddenColumns ?? new Set<string | number>(),
			onChange: (next) => onHiddenColumnsChange?.(next ?? new Set<string | number>()),
		})

	const columnById = useMemo(() => {
		const map = new Map<string | number, DataTableColumn<T>>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

	const visibleColumns = useMemo(() => {
		const ordered: DataTableColumn<T>[] = []

		const seen = new Set<string | number>()

		for (const id of columnOrder) {
			const col = columnById.get(id)

			if (!col) continue

			seen.add(col.id)

			if (col.selectable || col.actions || col.pinned) {
				ordered.push(col)
				continue
			}

			if (hiddenColumns.has(col.id)) continue

			ordered.push(col)
		}

		// Append any column not represented in the stored order (e.g. added after mount).
		for (const col of columns) {
			if (seen.has(col.id)) continue

			if (!col.selectable && !col.actions && !col.pinned && hiddenColumns.has(col.id)) continue

			ordered.push(col)
		}

		return ordered
	}, [columns, columnById, columnOrder, hiddenColumns])

	const managerItems = useMemo<ColumnManagerItem[]>(
		() =>
			columns
				.filter((c) => !c.selectable && !c.actions)
				.map((c) => ({
					id: c.id,
					title: c.title ?? String(c.id),
					pinned: c.pinned,
					hideable: c.hideable,
				})),
		[columns],
	)

	const [manageOpen, setManageOpen] = useState(false)

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
			<DataTableHead columns={visibleColumns} />

			{loading ? (
				<TableLoading columns={visibleColumns.length} />
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
								columns={visibleColumns}
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
				{manageColumns && (
					<Toolbar aria-label="Column management">
						<Button
							variant="plain"
							size="sm"
							aria-haspopup="dialog"
							prefix={<Icon icon={<SlidersHorizontal />} />}
							onClick={() => setManageOpen(true)}
						>
							{manageColumnsLabel}
						</Button>
					</Toolbar>
				)}

				{batchActions && <Toolbar>{someSelected && batchActions(selection)}</Toolbar>}

				{stickyHeader ? (
					<div className={cn(k.stickyWrapper)} style={maxHeight ? { maxHeight } : undefined}>
						{tableContent}
					</div>
				) : (
					tableContent
				)}

				{manageColumns && (
					<Dialog open={manageOpen} onOpenChange={setManageOpen}>
						<DialogTitle>{manageColumnsLabel}</DialogTitle>
						<DialogBody>
							<ColumnManager
								columns={managerItems}
								order={columnOrder}
								onOrderChange={setColumnOrder}
								hidden={hiddenColumns}
								onHiddenChange={setHiddenColumns}
								onSavePreset={onSavePreset}
							/>
						</DialogBody>
						<DialogActions>
							<Button variant="plain" onClick={() => setManageOpen(false)}>
								Done
							</Button>
						</DialogActions>
					</Dialog>
				)}
			</div>
		</DataTableProvider>
	)
}
