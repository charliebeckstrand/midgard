'use client'

import { useState } from 'react'
import type { GridSortState } from './context'
import { sameSorts } from './engine/grid-sort/state'

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
 * same commit as the sort (a synchronous re-sort) snapshots the new order at
 * once. Its rows therefore never flash dim.
 *
 * @internal
 */
export function useServerSortSettle<T>(args: {
	enabled: boolean
	sort: GridSortState[]
	rows: readonly T[]
}): boolean {
	const { enabled, sort, rows } = args

	// The sort the on-screen rows reflect, and the rows it was taken with. It is
	// taken again in the render where `rows` change, so the settle state is known
	// in the render of the change and costs no second render.
	const [settled, setSettled] = useState({ rows, sort })

	let settledSort = settled.sort

	// Rows landed: they now reflect the live sort, so take it as the settled order.
	if (settled.rows !== rows) {
		settledSort = sort

		setSettled({ rows, sort })
	}

	// In flight only while the live sort has moved off the settled order.
	return enabled && !sameSorts(settledSort, sort)
}
