/**
 * A move of one item in an ordered list from a menu: one place back, one place
 * forward, to the first place, or to the last place. A menu move is the
 * single-pointer path of a reorder (WCAG 2.5.7). A label names the direction
 * on the screen, so the shell chooses the words.
 *
 * @internal
 */
export type GridMoveTarget = 'previous' | 'next' | 'first' | 'last'

/**
 * The menu moves of the items of one ordered list, by the string key of an
 * item. `targets` gives the moves that change the order of an item, in the
 * order of the argument. `move` commits one move through the same callback
 * that a drop calls, and announces the new place.
 *
 * @internal
 */
export type GridItemMoves = {
	targets: <M extends GridMoveTarget>(key: string, offered: readonly M[]) => M[]
	move: (key: string, target: GridMoveTarget) => void
}

/**
 * The index that a move takes an item at `from` to, in a list of `length`
 * items. Returns `null` when the move does not change the order, or when
 * `from` is not in the list.
 *
 * @internal
 */
function moveTargetIndex(from: number, length: number, target: GridMoveTarget): number | null {
	if (from < 0 || from >= length) return null

	const to = { previous: from - 1, next: from + 1, first: 0, last: length - 1 }[target]

	return to === from || to < 0 || to >= length ? null : to
}

/**
 * The moves in `offered` that change the place of the item at `from`.
 *
 * @internal
 */
export function availableMoves<M extends GridMoveTarget>(
	from: number,
	length: number,
	offered: readonly M[],
): M[] {
	return offered.filter((target) => moveTargetIndex(from, length, target) !== null)
}

/**
 * Moves the item at `from` by `target`. Returns the next order and the 1-based
 * position of the item in it, or `null` when the move does not change the
 * order. The input list does not change.
 *
 * @internal
 */
export function planMove<T>(
	items: readonly T[],
	from: number,
	target: GridMoveTarget,
): { next: T[]; position: number } | null {
	const to = moveTargetIndex(from, items.length, target)

	if (to === null) return null

	const next = items.slice()

	const [item] = next.splice(from, 1) as [T]

	next.splice(to, 0, item)

	return { next, position: to + 1 }
}
