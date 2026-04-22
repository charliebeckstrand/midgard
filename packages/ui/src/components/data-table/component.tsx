'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { SlidersHorizontal } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
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

export type DataTableVirtualize = boolean | { estimateSize?: number; overscan?: number }

const DEFAULT_ROW_HEIGHT = 44
const DEFAULT_OVERSCAN = 10

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

	/**
	 * Enables row virtualization via `@tanstack/react-virtual`. Only rows in
	 * the scroll viewport (plus overscan) render to the DOM. Requires
	 * `maxHeight` — virtualization needs a scroll container of known size.
	 *
	 * Pass `true` for defaults (44px row height, 10 overscan), or an object
	 * to tune. Assumes uniform row heights.
	 */
	virtualize?: DataTableVirtualize

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
	virtualize,
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

	// Virtualization. `useVirtualizer` is always called to satisfy the Rules of
	// Hooks; when `virtualize` is off, count=0 makes it a no-op.
	const scrollRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: virtualizeEnabled && !loading ? rows.length : 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => estimateSize,
		overscan,
	})

	const virtualItems = virtualizeEnabled ? virtualizer.getVirtualItems() : []

	const totalSize = virtualizeEnabled ? virtualizer.getTotalSize() : 0

	const topSpacer = virtualItems[0]?.start ?? 0

	const lastItem = virtualItems[virtualItems.length - 1]

	const bottomSpacer = lastItem ? totalSize - lastItem.end : 0

	const needsScrollWrapper = stickyHeader || virtualizeEnabled

	function renderRow(row: T, index: number) {
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
	}

	const tableContent = (
		<Table dense={dense} bleed={bleed} grid={grid} striped={striped} className={className}>
			<DataTableHead columns={visibleColumns} />

			{loading ? (
				<TableLoading columns={visibleColumns.length} />
			) : virtualizeEnabled ? (
				<TableBody>
					{topSpacer > 0 && (
						<tr data-slot="data-table-spacer">
							<td
								colSpan={visibleColumns.length}
								style={{ height: topSpacer, padding: 0, border: 0 }}
							/>
						</tr>
					)}
					{virtualItems.map((vr) => renderRow(rows[vr.index] as T, vr.index))}
					{bottomSpacer > 0 && (
						<tr data-slot="data-table-spacer">
							<td
								colSpan={visibleColumns.length}
								style={{ height: bottomSpacer, padding: 0, border: 0 }}
							/>
						</tr>
					)}
				</TableBody>
			) : (
				<TableBody>{rows.map(renderRow)}</TableBody>
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
