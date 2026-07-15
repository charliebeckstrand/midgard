'use client'

import type { Table } from '@tanstack/react-table'
import { useMemo } from 'react'
import { resolveExportActions } from './engine/grid-export/resolve'
import type { GridExportAction, GridExportEntry, GridExportRows } from './engine/grid-export/types'
import type { GridColumn } from './types'

export type { GridExportAction } from './engine/grid-export/types'

/**
 * Resolves the `exportable` prop (see {@link GridDataProps.exportable}) into
 * the export actions the toolbar dropdown and context menus render — one per
 * configured type, via {@link resolveExportActions}. Each action's context
 * builds lazily at run time, so it always reflects the grid's current state
 * rather than the state at the last render that changed `exportable`,
 * `columns`, `table`, or `exportRows`.
 *
 * Without `exportRows` the rows come from the engine's sorted row model — the
 * selected rows when a selection is active, else the full filtered/sorted set
 * (all pages the engine holds). With `exportRows` set — the escape hatch for
 * server pagination, where the engine only ever holds the current page — its
 * return value wins outright: the awaited list is exported whole, and any
 * selection is ignored.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridExport<T>(args: {
	exportable: boolean | GridExportEntry<T>[] | undefined
	columns: GridColumn<T>[]
	table: Table<T>
	exportRows?: GridExportRows<T>
}): GridExportAction[] {
	const { exportable, columns, table, exportRows } = args

	return useMemo(
		() =>
			resolveExportActions(exportable, () => {
				if (exportRows) {
					const rows = exportRows()

					// Stay synchronous for an in-memory full list; await only a
					// genuine server round-trip, so the sync download path is
					// untouched when `exportRows` returns an array outright.
					return rows instanceof Promise
						? rows.then((resolved) => ({ columns, rows: resolved }))
						: { columns, rows }
				}

				const sorted = table.getSortedRowModel().rows

				const selected = sorted.filter((row) => row.getIsSelected())

				const rows = (selected.length > 0 ? selected : sorted).map((row) => row.original)

				return { columns, rows }
			}),
		[exportable, columns, table, exportRows],
	)
}
