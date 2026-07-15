'use client'

import type { Table } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveExportActions } from './engine/grid-export/resolve'
import type { GridExportAction, GridExportEntry, GridExportRows } from './engine/grid-export/types'
import type { GridColumn } from './types'

export type { GridExportAction } from './engine/grid-export/types'

/**
 * Resolves the `exportable` prop (see {@link GridDataProps.exportable}) into
 * the export actions the toolbar dropdown and context menus render — one per
 * configured type, via {@link resolveExportActions} — plus a `pending` flag the
 * toolbar's Export button reads to show a spinner while an async export is in
 * flight. Each action's context builds lazily at run time, so it always
 * reflects the grid's current state rather than the state at the last render
 * that changed `exportable`, `columns`, `table`, or `exportRows`.
 *
 * Without `exportRows` the rows come from the engine's sorted row model — the
 * selected rows when a selection is active, else the full filtered/sorted set
 * (all pages the engine holds). With `exportRows` set — the escape hatch for
 * server pagination, where the engine only ever holds the current page — its
 * return value wins outright: the awaited list is exported whole, and any
 * selection is ignored.
 *
 * When an `exportRows` source returns a promise, the awaited round-trip raises
 * `pending` and calls `onPending(true)`, then lowers it (and calls
 * `onPending(false)`) once every in-flight export settles — a count, not a
 * boolean, so overlapping exports don't clear each other early. Synchronous
 * exports finish inside the click and never toggle it.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridExport<T>(args: {
	exportable: boolean | GridExportEntry<T>[] | undefined
	columns: GridColumn<T>[]
	table: Table<T>
	exportRows?: GridExportRows<T>
	onPending?: (pending: boolean) => void
}): { actions: GridExportAction[]; pending: boolean } {
	const { exportable, columns, table, exportRows, onPending } = args

	const [pendingCount, setPendingCount] = useState(0)

	// Stable so it never re-memos the actions; a count (not a boolean) keeps
	// overlapping async exports from clearing each other's pending state early.
	const trackAsync = useCallback((active: boolean) => {
		setPendingCount((count) => (active ? count + 1 : Math.max(0, count - 1)))
	}, [])

	const pending = pendingCount > 0

	// Emit the public event on each idle↔busy transition, comparing against the
	// last emitted value so mount (and a StrictMode double-invoke) stays silent.
	// An `onPending` identity change alone re-runs this but finds no transition,
	// so it emits nothing — no latest-ref needed to hold the callback stable.
	const lastEmitted = useRef(pending)

	useEffect(() => {
		if (lastEmitted.current === pending) return

		lastEmitted.current = pending

		onPending?.(pending)
	}, [pending, onPending])

	const actions = useMemo(
		() =>
			resolveExportActions(
				exportable,
				() => {
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
				},
				trackAsync,
			),
		[exportable, columns, table, exportRows, trackAsync],
	)

	return { actions, pending }
}
