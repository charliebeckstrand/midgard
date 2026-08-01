'use client'

import type { Row, Table } from '@tanstack/react-table'
import { useMemo } from 'react'
import { resolveExportActions } from './engine/grid-export/resolve'
import type { GridExportAction, GridExportEntry, GridExportRows } from './engine/grid-export/types'
import { deriveLeafRows } from './engine/grid-table/state'
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
 * Without `exportRows` the rows come from the engine's sorted row model, first
 * collapsed to its leaf set — the selected rows when a selection is active, else
 * the full filtered/sorted set (all pages the engine holds). With `exportRows`
 * set — the escape hatch for server pagination, where the engine only ever holds
 * the current page — its return value wins outright: the awaited list is
 * exported whole, and any selection is ignored.
 *
 * @remarks
 * The collapse is load-bearing under grouping. Client grouping runs before
 * sorting in the engine's pipeline, so the sorted row model is the group-header
 * rows, and a group header's `original` is its first leaf's datum — exporting
 * that model directly yields one row per group. Group-header ids are also absent
 * from the mirrored selection state, so an active selection reads as empty and
 * silently falls back to the full set. Collapsing to leaves first answers both.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridExport<T>(args: {
	exportable: boolean | GridExportEntry<T>[] | undefined
	columns: GridColumn<T>[]
	table: Table<T>
	exportRows?: GridExportRows<T>
	/** Whether client grouping is active, so group headers stand in for their leaves. */
	grouped: boolean
	/** Identifies a consumer-supplied group-header row under manual grouping; `null` otherwise. */
	manualGroupRow: ((row: T) => boolean) | null
}): GridExportAction[] {
	const { exportable, columns, table, exportRows, grouped, manualGroupRow } = args

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

				// Manual grouping keeps the engine ungrouped, so its header rows
				// arrive as ordinary rows and drop by predicate; client grouping
				// expands each header back to its full leaf set.
				const leaves: Row<T>[] = manualGroupRow
					? sorted.filter((row) => !manualGroupRow(row.original))
					: (deriveLeafRows(sorted, grouped) ?? [])

				const selected = leaves.filter((row) => row.getIsSelected())

				const rows = (selected.length > 0 ? selected : leaves).map((row) => row.original)

				return { columns, rows }
			}),
		[exportable, columns, table, exportRows, grouped, manualGroupRow],
	)
}
