'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { useControllable } from '../../hooks'
import type { DataTableColumnManagerConfig } from './data-table'
import { EMPTY_SET } from './data-table-constants'
import type { DataTableColumn, DataTableColumnManagerItem } from './types'

function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

type UseDataTableColumnsOptions<T> = {
	columns: DataTableColumn<T>[]
	columnManagerConfig: DataTableColumnManagerConfig | undefined
}

type UseDataTableColumnsResult<T> = {
	columnOrder: (string | number)[]
	setColumnOrder: (next: (string | number)[]) => void
	hiddenColumns: Set<string | number>
	setHiddenColumns: (next: Set<string | number>) => void
	visibleColumns: DataTableColumn<T>[]
	managerItems: DataTableColumnManagerItem[]
	manageColumns: boolean
	manageColumnsLabel: ReactNode
}

/**
 * Owns the data table's column slice: controllable `columnOrder` and
 * `hiddenColumns`, the derived `columnById` map, the ordered + filtered
 * `visibleColumns` list, and the `managerItems` shape consumed by the
 * column-manager dialog. `manageColumns` / `manageColumnsLabel` collapse the
 * config's enabled flag and label into a couple of plain values for the
 * dialog's render gate.
 */
export function useDataTableColumns<T>({
	columns,
	columnManagerConfig,
}: UseDataTableColumnsOptions<T>): UseDataTableColumnsResult<T> {
	const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns])

	const [columnOrder = defaultOrder, setColumnOrder] = useControllable<(string | number)[]>({
		value: columnManagerConfig?.order,
		defaultValue: columnManagerConfig?.defaultOrder ?? defaultOrder,
		onValueChange: (next) => columnManagerConfig?.onOrderChange?.(next ?? []),
	})

	const [hiddenColumns = columnManagerConfig?.defaultHidden ?? EMPTY_SET, setHiddenColumns] =
		useControllable<Set<string | number>>({
			value: columnManagerConfig?.hidden,
			defaultValue: columnManagerConfig?.defaultHidden ?? EMPTY_SET,
			onValueChange: (next) =>
				columnManagerConfig?.onHiddenChange?.(next ?? new Set<string | number>()),
		})

	const manageColumns = columnManagerConfig?.enabled ?? false

	const manageColumnsLabel = columnManagerConfig?.label ?? 'Columns'

	const columnById = useMemo(() => {
		const map = new Map<string | number, DataTableColumn<T>>()

		for (const col of columns) map.set(col.id, col)

		return map
	}, [columns])

	const visibleColumnsCandidate = useMemo(() => {
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

	// Reuse the previous array reference when contents are element-wise identical
	// so `React.memo`'d row components skip rendering on no-op upstream churn —
	// e.g. consumer rebuilds the `columns` prop with stable column objects, or a
	// column-order change that doesn't affect the visible slice.
	const visibleColumnsRef = useRef(visibleColumnsCandidate)

	const visibleColumns = sameElements(visibleColumnsRef.current, visibleColumnsCandidate)
		? visibleColumnsRef.current
		: visibleColumnsCandidate

	visibleColumnsRef.current = visibleColumns

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

	return {
		columnOrder,
		setColumnOrder,
		hiddenColumns,
		setHiddenColumns,
		visibleColumns,
		managerItems,
		manageColumns,
		manageColumnsLabel,
	}
}
