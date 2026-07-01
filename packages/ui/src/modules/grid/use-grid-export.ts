'use client'

import type { Table } from '@tanstack/react-table'
import { useMemo } from 'react'
import { resolveExportActions } from './export/export-resolve'
import type { GridExportAction, GridExportEntry } from './export/types'
import type { GridColumn } from './types'

export type { GridExportAction } from './export/types'

/**
 * Resolves the `exportable` prop (see {@link GridDataProps.exportable}) into
 * the export actions the toolbar dropdown and context menus render — one per
 * configured type, via {@link resolveExportActions}. Each action's context
 * builds lazily from the engine's sorted row model at run time — the selected
 * rows when a selection is active, else the full filtered/sorted set (all
 * pages) — so it always reflects the grid's current state rather than the
 * state at the last render that changed `exportable`, `columns`, or `table`.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridExport<T>(args: {
	exportable: boolean | GridExportEntry<T>[] | undefined
	columns: GridColumn<T>[]
	table: Table<T>
}): GridExportAction[] {
	const { exportable, columns, table } = args

	return useMemo(
		() =>
			resolveExportActions(exportable, () => {
				const sorted = table.getSortedRowModel().rows

				const selected = sorted.filter((row) => row.getIsSelected())

				const rows = (selected.length > 0 ? selected : sorted).map((row) => row.original)

				return { columns, rows }
			}),
		[exportable, columns, table],
	)
}
