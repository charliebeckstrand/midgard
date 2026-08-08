'use client'

import { useMemo, useState } from 'react'
import { DEFAULT_EXPORTABLE } from './engine/grid-export/registry'
import { exportRowsContext, resolveExportActions, trackPending } from './engine/grid-export/resolve'
import type { GridExportAction, GridExportable, GridExportRows } from './engine/grid-export/types'
import type { GridColumn } from './types'

/**
 * The export actions for a grid whose export control lives *outside* it — a page
 * header's own actions menu, say, which must be server-rendered where a grid
 * toolbar can't reach. Resolves the same {@link GridDataProps.exportable} shape
 * the grid resolves internally, so the labels, the built-in exporters, and the
 * async pending state all match the grid's own Export items.
 *
 * @remarks `exportRows` is required: without the grid's engine there is no
 * filtered/sorted row model (and no selection) to infer rows from, so the caller
 * supplies them — the same escape hatch a server-paginated grid uses. Return an
 * array for an in-memory list, or a promise for a round-trip; while one is in
 * flight `pending` is true, for a spinner on whatever control hosts the actions.
 *
 * The `exportable` surfaces are ignored here — the caller *is* the surface. Pair
 * with `exportable={false}` on the grid so its own Export items stay out and the
 * page's control is the only one.
 *
 * @typeParam T - Shape of a single row.
 * @returns `{ actions, pending }` — one action per configured export type, and
 * whether an async export is in flight.
 */
export function useGridExportActions<T>(args: {
	/** Which export types to offer; same shape as {@link GridDataProps.exportable}. @defaultValue `['csv', 'excel']` */
	exportable?: GridExportable<T>
	/** The columns each row is read through, as the grid would. */
	columns: GridColumn<T>[]
	/** The rows to export — the full filtered/sorted set the page is showing. */
	exportRows: GridExportRows<T>
}): { actions: GridExportAction[]; pending: boolean } {
	// The same CSV + Excel pair an omitted `exportable` gives the grid, so an
	// out-of-grid menu never quietly gains a Print item the grid wouldn't show.
	const { exportable = DEFAULT_EXPORTABLE, columns, exportRows } = args

	const [pendingCount, setPendingCount] = useState(0)

	const actions = useMemo(
		() =>
			resolveExportActions(exportable, () => exportRowsContext(exportRows, columns)).map(
				(action) => ({ ...action, run: trackPending(action.run, setPendingCount) }),
			),
		[exportable, columns, exportRows],
	)

	return { actions, pending: pendingCount > 0 }
}
