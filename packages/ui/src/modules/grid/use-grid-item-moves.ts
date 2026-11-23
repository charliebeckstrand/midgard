'use client'

import { useMemo } from 'react'
import { announce } from '../../core/announcer'
import { movedText } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
import {
	availableMoves,
	type GridItemMoves,
	type GridMoveTarget,
	planMove,
} from './engine/grid-reorder-move'

/** Options for {@link useGridItemMoves}. @internal */
type GridItemMovesOptions<T> = {
	/** The items in their order: the same list that the drag sorts. */
	items: readonly T[]
	/** The key of an item, as a string: the same key that the drag reads. */
	getKey: (item: T) => string
	/** Commits the next order: the same callback that a drop calls. */
	commit: (next: T[]) => void
	/** The name of an item for the announcement: the same name that the drag reads. */
	describe: (item: T) => string
}

/**
 * The menu moves of a sortable list (see {@link GridItemMoves}). A move goes
 * through the `commit` of a drop, and the live region announces the new place,
 * such as "Name moved to position 2 of 4.". The words are the words of a drag
 * step, and the announcement is assertive, as a move from the menu of a Kanban
 * card is.
 *
 * @internal
 */
export function useGridItemMoves<T>({
	items,
	getKey,
	commit,
	describe,
}: GridItemMovesOptions<T>): GridItemMoves {
	const intl = useIntl()

	return useMemo(() => {
		const findIndex = (key: string) => items.findIndex((item) => getKey(item) === key)

		return {
			targets: <M extends GridMoveTarget>(key: string, offered: readonly M[]) =>
				availableMoves(findIndex(key), items.length, offered),
			move: (key: string, target: GridMoveTarget) => {
				const from = findIndex(key)

				const plan = planMove(items, from, target)

				const item = items[from]

				if (!plan || item === undefined) return

				commit(plan.next)

				announce(
					movedText(intl, describe(item), { position: plan.position, total: items.length }),
					{ assertive: true },
				)
			},
		}
	}, [items, getKey, commit, describe, intl])
}
