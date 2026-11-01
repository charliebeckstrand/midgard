import { useLayoutEffect, useRef } from 'react'
import { useGridNavContext } from './context'
import type { GridCursorRow } from './grid-cursor-order'

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
 * order, so the store keeps the first reference of an equal order. A windowed
 * body gives a memoized order, so a scroll frame compares nothing.
 *
 * @internal
 */
export function useGridCursorOrder(order: readonly GridCursorRow[]): void {
	const store = useGridNavContext()

	// The order that the store holds. Only the effects read it and write it.
	const publishedRef = useRef<readonly GridCursorRow[] | null>(null)

	useLayoutEffect(() => {
		const published = publishedRef.current

		if (published !== null && (order === published || sameOrder(order, published))) return

		publishedRef.current = order

		store.publish(order)
	}, [store, order])

	// The cleanup runs before the publish of a new store, so that publish starts
	// from no order.
	useLayoutEffect(
		() => () => {
			publishedRef.current = null

			store.publish(null)
		},
		[store],
	)
}
