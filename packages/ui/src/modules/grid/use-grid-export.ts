'use client'

import { useMemo, useState } from 'react'
import {
	exportRowsContext,
	resolveExportActions,
	resolveExportSurfaces,
	trackPending,
} from './engine/grid-export/resolve'
import type { GridExportAction, GridExportable, GridExportRows } from './engine/grid-export/types'
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
	/**
	 * Whether an async export is in flight, whichever surface started it. The
	 * grid's "Exporting" overlay and the toolbar trigger's spinner both read this
	 * one fact. The two therefore can't disagree about whether the grid is busy.
	 */
	pending: boolean
}

/**
 * Resolves the `exportable` prop (see {@link GridDataProps.exportable}) into
 * the export actions the toolbar dropdown and context menus render. There is one
 * per configured type, via {@link resolveExportActions}, split by the surfaces
 * the prop opens (see {@link resolveExportSurfaces}). A grid can therefore carry
 * the "Export" dropdown, the menu items, or both. Each action's context builds
 * lazily at run time. It therefore always reflects the grid's current state,
 * rather than the state at the last render that changed `exportable`, `columns`,
 * `rows`, or `exportRows`.
 *
 * Without `exportRows` the rows come from `rows`, which reads the engine when
 * the export runs (`GridTableResult.rowsForExport`). Those are the selected rows
 * when a selection is active, else the full filtered and sorted set. With
 * `exportRows` set, its return value wins outright. It is the escape hatch for
 * server pagination, where the engine only ever holds the current page. The
 * awaited list is exported whole, and any selection is ignored.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridExport<T>(args: {
	exportable: GridExportable<T> | undefined
	columns: GridColumn<T>[]
	/** Reads the rows to export when an export runs. */
	rows: () => T[]
	exportRows?: GridExportRows<T>
}): GridExportSurfaceActions {
	const { exportable, columns, rows, exportRows } = args

	// Counted, not flagged: two exports fired from different surfaces must both
	// settle before the grid stops reading as busy.
	const [pendingCount, setPendingCount] = useState(0)

	const actions = useMemo(
		() =>
			resolveExportActions(exportable, () =>
				exportRows ? exportRowsContext(exportRows, columns) : { columns, rows: rows() },
			).map((action) => ({ ...action, run: trackPending(action.run, setPendingCount) })),
		[exportable, columns, rows, exportRows],
	)

	const surfaces = resolveExportSurfaces(exportable)

	// Read field by field at the call site, so only the arrays' own identities
	// matter — both are already stable, and an off surface takes the fixed empty
	// set rather than a fresh one, contributing nothing to the menu resolvers'
	// dependencies.
	return {
		toolbar: surfaces.toolbar ? actions : NO_ACTIONS,
		contextMenu: surfaces.contextMenu ? actions : NO_ACTIONS,
		pending: pendingCount > 0,
	}
}
