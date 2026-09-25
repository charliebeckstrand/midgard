import { useLayoutEffect, useRef } from 'react'
import type { GridGroup } from './engine/grid-group/tree'
import {
	detailItemKey,
	groupItemKey,
	leafItemKey,
	rowItemKey,
	totalItemKey,
} from './engine/grid-items/items'
import { useGridNavContext } from './use-grid-navigation'

/**
 * One row of the cursor's order in a body that renders more than data rows. A
 * `data` row is a row of the grid's data: a leaf of a group, or a row of a
 * master-detail grid. The cursor visits each of its data columns. The other
 * kinds are one stop each. The cursor keeps its column while it sits on one.
 * A step past a group header thus lands in the same column again.
 *
 * The keys are the item keys of the windowed bodies. A windowed body thus
 * finds the row that the cursor names without an index map of its own.
 *
 * @internal
 */
export type GridCursorRow =
	| { key: string; kind: 'data'; row: unknown; parent?: string }
	| { key: string; kind: 'group'; expanded: boolean; toggle: () => void; level: 1 }
	| { key: string; kind: 'total'; parent: string }
	| { key: string; kind: 'detail'; parent: string }

/**
 * The cursor's order of a client-grouped body: each group header, then its
 * leaves and its total when the group is open. A closed group contributes its
 * header only. The groups come in the order the body renders them.
 *
 * @param toggle - Opens or closes a group, by its id.
 * @internal
 */
export function groupedCursorRows<T>(
	groups: GridGroup<T>[],
	totaled: boolean,
	toggle: (id: string) => void,
): GridCursorRow[] {
	const rows: GridCursorRow[] = []

	for (const group of groups) {
		const key = groupItemKey(group.id)

		const { expanded } = group

		rows.push({ key, kind: 'group', expanded, toggle: () => toggle(group.id), level: 1 })

		if (!expanded) continue

		for (const leaf of group.leaves) {
			rows.push({ key: leafItemKey(leaf.id), kind: 'data', row: leaf.row, parent: key })
		}

		if (totaled) rows.push({ key: totalItemKey(group.id), kind: 'total', parent: key })
	}

	return rows
}

/**
 * The cursor's order of a master-detail body: each data row, then its detail
 * panel when the panel is open.
 *
 * @internal
 */
export function detailCursorRows<T>(
	rows: T[],
	rowKeys: (string | number)[],
	open: (row: T, rowKey: string | number) => boolean,
): GridCursorRow[] {
	const order: GridCursorRow[] = []

	rows.forEach((row, index) => {
		const rowKey = rowKeys[index] as string | number

		const key = rowItemKey(rowKey)

		order.push({ key, kind: 'data', row })

		if (open(row, rowKey)) order.push({ key: detailItemKey(rowKey), kind: 'detail', parent: key })
	})

	return order
}

/** Whether two orders name the same rows, in the same order, with the same state. @internal */
function sameOrder(a: readonly GridCursorRow[], b: readonly GridCursorRow[]): boolean {
	if (a.length !== b.length) return false

	return a.every((entry, index) => {
		const other = b[index] as GridCursorRow

		if (entry.key !== other.key || entry.kind !== other.kind) return false

		if (entry.kind === 'data') return other.kind === 'data' && entry.row === other.row

		return entry.kind !== 'group' || (other.kind === 'group' && entry.expanded === other.expanded)
	})
}

/**
 * Gives the body's order to the cursor. The cursor then walks this order in
 * place of the data rows, and it forgets the order when the body unmounts.
 *
 * @remarks The cursor finds its row again by key each time it gets a new
 * order, so an equal order keeps its first reference. A windowed body gives a
 * memoized order, so a scroll frame compares nothing.
 *
 * @internal
 */
export function useGridCursorOrder(order: readonly GridCursorRow[]): void {
	const store = useGridNavContext()

	const stableRef = useRef(order)

	if (order !== stableRef.current && !sameOrder(order, stableRef.current)) {
		stableRef.current = order
	}

	const stable = stableRef.current

	useLayoutEffect(() => store.publish(stable), [store, stable])

	useLayoutEffect(() => () => store.publish(null), [store])
}

/**
 * Gives an order to the cursor from a body that renders no hook of its own.
 * It renders nothing (see {@link useGridCursorOrder}). @internal
 */
export function GridCursorOrder({ order }: { order: readonly GridCursorRow[] }): null {
	useGridCursorOrder(order)

	return null
}
