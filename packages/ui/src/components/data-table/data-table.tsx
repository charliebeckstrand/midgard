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
import type {
	DataTableColumn,
	DataTableColumnManagerItem,
	DataTableColumnManagerPreset,
} from './types'

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

	const [selectionRaw, setSelectionRaw] = useControllable<Set<string | number>>({
		value: selectionConfig?.value,
		defaultValue: selectionConfig?.defaultValue ?? new Set(),
		onChange: selectionConfig?.onValueChange,
	})

	const selection = selectionRaw ?? new Set<string | number>()

	const batchActions = selectionConfig?.batchActions

	const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [columnOrder = defaultOrder, setColumnOrder] = useControllable<(string | number)[]>({
		value: columnManagerConfig?.order,
		defaultValue: columnManagerConfig?.defaultOrder ?? defaultOrder,
		onChange: (next) => columnManagerConfig?.onOrderChange?.(next ?? []),
	})

	const [
		hiddenColumns = columnManagerConfig?.defaultHidden ?? new Set<string | number>(),
		setHiddenColumns,
	] = useControllable<Set<string | number>>({
		value: columnManagerConfig?.hidden,
		defaultValue: columnManagerConfig?.defaultHidden ?? new Set<string | number>(),
		onChange: (next) => columnManagerConfig?.onHiddenChange?.(next ?? new Set<string | number>()),
	})

	const manageColumns = columnManagerConfig?.enabled ?? false

	const manageColumnsLabel = columnManagerConfig?.label ?? 'Columns'

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

	const managerItems = useMemo<DataTableColumnManagerItem[]>(
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

	const rowKeys = useMemo<(string | number)[]>(
		() => rows.map((row, i) => getRowKey(row, i)),
		[rows, getRowKey],
	)

	const allSelected =
		rowKeys.length > 0 && rowKeys.every((rk: string | number) => selection.has(rk))

	const someSelected = rowKeys.some((rk: string | number) => selection.has(rk))

	// Mirror rowKeys in a ref so toggleAll stays stable across selection edits.
	const rowKeysRef = useRef(rowKeys)

	rowKeysRef.current = rowKeys

	const toggleRow = useCallback(
		(key: string | number) => {
			setSelectionRaw((prev) => {
				const next = new Set(prev ?? [])

				if (next.has(key)) next.delete(key)
				else next.add(key)

				return next
			})
		},
		[setSelectionRaw],
	)

	const toggleAll = useCallback(() => {
		setSelectionRaw((prev) => {
			const keys = rowKeysRef.current

			const current = prev ?? new Set<string | number>()

			const every = keys.length > 0 && keys.every((k) => current.has(k))

			return every ? new Set() : new Set(keys)
		})
	}, [setSelectionRaw])

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

			{loading ? (
				<TableLoading columns={visibleColumns.length} />
			) : virtualizeEnabled ? (
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
			) : (
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
			)}
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
