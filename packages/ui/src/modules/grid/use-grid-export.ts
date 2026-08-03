'use client'

import type { Row, Table } from '@tanstack/react-table'
import { useMemo } from 'react'
import { resolveExportActions, resolveExportSurfaces } from './engine/grid-export/resolve'
import type { GridExportAction, GridExportable, GridExportRows } from './engine/grid-export/types'
import { deriveLeafRows } from './engine/grid-table/state'
import type { GridColumn } from './types'

export type { GridExportAction } from './engine/grid-export/types'

/** A surface offering no export actions. A fixed identity, so an off surface never re-renders its menu. @internal */
const NO_ACTIONS: GridExportAction[] = []

/**
 * The export actions each surface offers, empty where the surface is off.
 *
 * @internal
 */
export type GridExportSurfaceActions = {
	/** The toolbar's "Export" dropdown. */
	toolbar: GridExportAction[]
	/** The header and cell right-click menus, and the builder contexts they hand out. */
	contextMenu: GridExportAction[]
}

/**
 * Resolves the `exportable` prop (see {@link GridDataProps.exportable}) into
 * the export actions the toolbar dropdown and context menus render — one per
 * configured type, via {@link resolveExportActions}, split by the surfaces the
 * prop opens (see {@link resolveExportSurfaces}), so a grid can carry the
 * "Export" dropdown, the menu items, or both. Each action's context builds
 * lazily at run time, so it always reflects the grid's current state rather than
 * the state at the last render that changed `exportable`, `columns`, `table`, or
 * `exportRows`.
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
	exportable: GridExportable<T> | undefined
	columns: GridColumn<T>[]
	table: Table<T>
	exportRows?: GridExportRows<T>
	/** Whether client grouping is active, so group headers stand in for their leaves. */
	grouped: boolean
	/** Identifies a consumer-supplied group-header row under manual grouping; `null` otherwise. */
	manualGroupRow: ((row: T) => boolean) | null
}): GridExportSurfaceActions {
	const { exportable, columns, table, exportRows, grouped, manualGroupRow } = args

	const actions = useMemo(
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

				// `deriveLeafRows` owns both grouping modes; `sorted` is never null,
				// so the coalesce only satisfies its nullable return.
				const leaves: Row<T>[] = deriveLeafRows(sorted, grouped, manualGroupRow) ?? []

				const selected = leaves.filter((row) => row.getIsSelected())

				const rows = (selected.length > 0 ? selected : leaves).map((row) => row.original)

				return { columns, rows }
			}),
		[exportable, columns, table, exportRows, grouped, manualGroupRow],
	)

	const surfaces = resolveExportSurfaces(exportable)

	// The pair is read field by field at the call site, so only the arrays' own
	// identities matter — both are already stable, and an off surface takes the
	// fixed empty set rather than a fresh one, contributing nothing to the menu
	// resolvers' dependencies.
	return {
		toolbar: surfaces.toolbar ? actions : NO_ACTIONS,
		contextMenu: surfaces.contextMenu ? actions : NO_ACTIONS,
	}
}
