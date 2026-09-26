'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import type { GridSortState } from './context'
import { nextSort, sortsEqual } from './engine/grid-sort/state'
import type { GridSort } from './grid-data-types'

/** Stable empty sort default; the unsorted state, read-only and replaced wholesale. @internal */
const EMPTY_SORT: GridSortState[] = []

/**
 * Owns the grid's controllable sort. The resolved list is ordered and never
 * `undefined` — an empty list is unsorted. The raw setter is what the engine and
 * header menu write through. `toggleSort` cycles a column's sort via
 * {@link nextSort} (Shift-click folds it into the existing sort).
 *
 * @internal
 */
export function useGridSort(config: GridSort | undefined): {
	sort: GridSortState[]
	setSort: (sort: GridSortState[]) => void
	toggleSort: (column: string | number, additive: boolean) => void
} {
	const [sortState, setSortState] = useControllable<GridSortState[]>({
		value: config?.value,
		defaultValue: config?.defaultValue ?? EMPTY_SORT,
		// The list is never meaningfully `undefined`; coalesce so the public callback
		// keeps its non-nullable shape (an empty list is the unsorted state).
		onValueChange: (next) => config?.onValueChange?.(next ?? EMPTY_SORT),
	})

	const cycle = config?.cycle

	const toggleSort = useCallback(
		(column: string | number, additive: boolean) =>
			setSortState((prev) => nextSort(prev ?? EMPTY_SORT, column, additive, cycle)),
		[setSortState, cycle],
	)

	return { sort: sortState ?? EMPTY_SORT, setSort: setSortState, toggleSort }
}

/**
 * Tracks whether a server-side (manual) sort is in flight. That is the interval
 * between the grid emitting a sort change and the consumer handing back the
 * reordered `rows`. The body can then dim its rows to a settle wash until the
 * new order lands (see `k.body.settling`). Enabled only under
 * {@link GridSort.manual}.
 *
 * The grid settles while the live `sort` differs from the order the on-screen
 * `rows` reflect. That order is snapshotted whenever `rows` change, since
 * they've then caught up to the sort that fetched them. The compare is by
 * value, not identity. A rapid asc→desc→clear ends on a cleared sort whose rows
 * are already shown, because no fetch landed between the clicks. The wash
 * therefore lifts rather than latching on. That was the reported stuck-pulse
 * bug, which a reference-only "rows changed?" test left on because the consumer
 * handed back the unchanged default set. A consumer that swaps `rows` in the
 * same commit as the sort — a synchronous re-sort — snapshots the new order at
 * once. Its rows therefore never flash dim.
 *
 * @internal
 */
export function useServerSortSettle<T>(args: {
	enabled: boolean
	sort: GridSortState[]
	rows: T[]
}): boolean {
	const { enabled, sort, rows } = args

	const [settling, setSettling] = useState(false)

	// The sort the on-screen rows reflect; re-snapshotted each time `rows` change.
	const settledSortRef = useRef(sort)

	const prevRowsRef = useRef(rows)

	useEffect(() => {
		const rowsChanged = prevRowsRef.current !== rows

		prevRowsRef.current = rows

		// Rows landed: they now reflect the live sort — take it as the settled order.
		if (rowsChanged) settledSortRef.current = sort

		// In flight only while the live sort has moved off the settled order.
		setSettling(enabled && !sortsEqual(settledSortRef.current, sort))
	}, [enabled, sort, rows])

	return enabled && settling
}
