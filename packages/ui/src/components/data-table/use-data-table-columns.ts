'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { isDataColumn } from '../../utilities'
import type { DataTableColumnManagerConfig } from './data-table'
import type { DataTableColumn, DataTableColumnManagerItem } from './types'
import { useDataTableColumnVisibility } from './use-data-table-column-visibility'

function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

type DataTableColumnsOptions<T> = {
	columns: DataTableColumn<T>[]
	columnManagerConfig: DataTableColumnManagerConfig | undefined
}

type DataTableColumnsResult<T> = {
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
 * config's enabled flag and label into plain values for the dialog's render
 * gate.
 */
export function useDataTableColumns<T>({
	columns,
	columnManagerConfig,
}: DataTableColumnsOptions<T>): DataTableColumnsResult<T> {
	const {
		order: columnOrder,
		setOrder: setColumnOrder,
		hidden: hiddenColumns,
		setHidden: setHiddenColumns,
		byId: columnById,
	} = useDataTableColumnVisibility({
		columns,
		order: columnManagerConfig?.order,
		defaultOrder: columnManagerConfig?.defaultOrder,
		onOrderChange: columnManagerConfig?.onOrderChange,
		hidden: columnManagerConfig?.hidden,
		defaultHidden: columnManagerConfig?.defaultHidden,
		onHiddenChange: columnManagerConfig?.onHiddenChange,
	})

	const manageColumns = columnManagerConfig?.enabled ?? false

	const manageColumnsLabel = columnManagerConfig?.label ?? 'Columns'

	const visibleColumnsCandidate = useMemo(() => {
		const ordered: DataTableColumn<T>[] = []

		const seen = new Set<string | number>()

		for (const id of columnOrder) {
			const col = columnById.get(id)

			if (!col) continue

			seen.add(col.id)

			if (!isDataColumn(col) || col.pinned) {
				ordered.push(col)

				continue
			}

			if (hiddenColumns.has(col.id)) continue

			ordered.push(col)
		}

		// Append any column not represented in the stored order (e.g. added after mount).
		for (const col of columns) {
			if (seen.has(col.id)) continue

			if (isDataColumn(col) && !col.pinned && hiddenColumns.has(col.id)) continue

			ordered.push(col)
		}

		return ordered
	}, [columns, columnById, columnOrder, hiddenColumns])

	// Reuse the previous array reference when contents are element-wise identical.
	const visibleColumnsRef = useRef(visibleColumnsCandidate)

	const visibleColumns = sameElements(visibleColumnsRef.current, visibleColumnsCandidate)
		? visibleColumnsRef.current
		: visibleColumnsCandidate

	visibleColumnsRef.current = visibleColumns

	const managerItems = useMemo<DataTableColumnManagerItem[]>(
		() =>
			columns.filter(isDataColumn).map((c) => ({
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
