'use client'

import type { KeyboardEvent } from 'react'
import { announce } from '../core/announcer'
import { movedText, reorderSubject, returnedText } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { clamp } from '../utilities/clamp'
import { hasBrowserModifier } from '../utilities/modifier-keys'
import { moveItem } from '../utilities/move-item'
import { useKeyboardLifted } from './use-keyboard-lifted'
import { useStableEvent } from './use-stable-event'

/**
 * Options for {@link useKeyboardReorder}: the items, the reorder report, the item lookups, and
 * the step rule.
 *
 * @internal
 */
export type KeyboardReorderOptions<T> = {
	/** Ordered items, in the order they render. */
	items: readonly T[]
	/** Stable key extractor. */
	getKey: (item: T) => string
	/**
	 * Called with the next ordering, the key of the item that moved, and its new
	 * index. Omit to navigate without reordering.
	 */
	onReorder?: (next: T[], id: string, index: number) => void
	/** Moves focus to the item with the key. It must keep its identity. */
	focusItem: (id: string) => void
	/** The accessible name of the item with the key, for announcements. */
	itemName: (id: string) => string
	/**
	 * How far a key moves in the flat order, or `null` for a key that does not step. Home and End
	 * are not steps: the hook handles them.
	 */
	stepFor: (key: string) => number | null
	/** Whether the surface takes a lift. See `useKeyboardLifted`. */
	enabled: boolean
}

/**
 * A move that a menu offers for an item: one place back or on, or to the first
 * or the last place. A menu is the single-pointer path of a drag (WCAG 2.2 SC
 * 2.5.7).
 *
 * @internal
 */
export type ReorderMove = 'previous' | 'next' | 'first' | 'last'

/** The moves of a menu, in menu order. */
const REORDER_MOVES: readonly ReorderMove[] = ['previous', 'next', 'first', 'last']

/** The index that `move` takes the item at `index` to, in a list whose last index is `last`. */
function moveTarget(move: ReorderMove, index: number, last: number): number {
	if (move === 'first') return 0

	if (move === 'last') return last

	return clamp(index + (move === 'next' ? 1 : -1), 0, last)
}

/** The item a key acts on: its key, its index in `items`, the last index, and its description. */
type ReorderTarget = { id: string; index: number; last: number; describe: () => string }

/**
 * The index that a key goes to: focus when nothing is lifted, and the item when it is lifted. It is
 * `null` for a key that does not move.
 */
function keyTarget(key: string, step: number | null, { index, last }: ReorderTarget) {
	if (step !== null) return clamp(index + step, 0, last)

	if (key === 'Home') return 0

	return key === 'End' ? last : null
}

/** The keys that end a lift: Enter drops it, and Escape cancels it. */
const liftEnds: Partial<Record<string, 'drop' | 'cancel'>> = { Enter: 'drop', Escape: 'cancel' }

/**
 * Where Escape puts the item `id` back: the order of the lift start, and the index of the item
 * there. It is `null` when the lift has no origin, or the item is not in it.
 */
function returnTarget<T>(
	origin: readonly T[] | null,
	getKey: (item: T) => string,
	id: string,
): { items: T[]; index: number } | null {
	const index = origin?.findIndex((item) => getKey(item) === id) ?? -1

	return origin && index !== -1 ? { items: [...origin], index } : null
}

/**
 * The keyboard reorder model of a sortable list. Space lifts, a step key moves focus
 * or, when lifted, moves the item, Home and End jump to the ends, and Enter drops. Each step
 * commits through `onReorder`. Escape cancels the lift: it reports the order of the lift start,
 * the key of the item, and its index there. Each change is announced.
 *
 * @remarks
 * A step clamps at the ends and does not wrap. `onItemKeyDown` is a stable event: it keeps its
 * identity and reads the newest options. With `items` in its dependencies, the handler, and each
 * item that takes it, got a new identity for each move.
 *
 * The menu path takes the same model. `menuMoves` gives the moves that change the place of an
 * item, and `menuMove` commits one through `onReorder` and announces it as a step does. The menu
 * reads the name of the item when it opens, because an open menu can sit in the item and add its
 * own text to the name. A surface that takes no lift, such as a locked list, makes no menu move.
 *
 * @returns `{ liftedId, setLiftedId, onItemKeyDown, onItemBlur, menuMoves, menuMove }`.
 * @internal
 */
export function useKeyboardReorder<T>(options: KeyboardReorderOptions<T>) {
	const intl = useIntl()

	const {
		liftedId,
		readLifted,
		setLiftedId,
		toggleLift,
		drop,
		markMoved,
		takeOrigin,
		refocus,
		onBlur: onItemBlur,
	} = useKeyboardLifted<readonly T[]>(options.focusItem, options.enabled)

	/**
	 * Lifted: Escape puts the items back in the order of the lift start, as a pointer
	 * cancel does. A lift with no move only drops.
	 */
	const cancel = useStableEvent((at: ReorderTarget) => {
		const { getKey, onReorder, itemName } = options

		const back = returnTarget(takeOrigin(), getKey, at.id)

		if (back === null || !onReorder) {
			drop(at.describe)

			return
		}

		onReorder(back.items, at.id, back.index)

		const slot = { position: back.index + 1, total: back.items.length }

		announce(returnedText(intl, itemName(at.id), slot), { assertive: true })

		refocus(at.id)
	})

	const onItemKeyDown = useStableEvent((id: string, event: KeyboardEvent) => {
		// A modified key is a browser or OS gesture, never a move.
		if (hasBrowserModifier(event) || event.shiftKey) return

		const { items, getKey, onReorder, focusItem, itemName, stepFor } = options

		/** Not lifted: a step or Home or End moves focus. */
		const navigate = (step: number | null, at: ReorderTarget) => {
			const target = keyTarget(event.key, step, at)

			const item = target === null || target === at.index ? undefined : items[target]

			if (item === undefined) return

			event.preventDefault()

			focusItem(getKey(item))
		}

		/** Lifted: a step or Home or End moves the item, Enter drops it, and Escape cancels. */
		const carry = (step: number | null, at: ReorderTarget) => {
			const target = keyTarget(event.key, step, at)

			if (target === null) {
				const end = liftEnds[event.key]

				if (!end) return

				event.preventDefault()

				if (end === 'cancel') cancel(at)
				else drop(at.describe)

				return
			}

			event.preventDefault()

			if (!onReorder || at.index === -1 || target === at.index) return

			onReorder(moveItem(items, at.index, target), at.id, target)

			markMoved()

			announce(movedText(intl, itemName(at.id), { position: target + 1, total: items.length }), {
				assertive: true,
			})

			refocus(at.id)
		}

		const index = items.findIndex((item) => getKey(item) === id)

		const describe = () =>
			reorderSubject(
				intl,
				itemName(id),
				index === -1 ? null : { position: index + 1, total: items.length },
			)

		if (event.key === ' ') {
			event.preventDefault()

			// A surface that takes no lift, such as a locked list, ignores Space. Its
			// arrows still move the focus.
			if (options.enabled) toggleLift(id, describe, items)

			return
		}

		const at = { id, index, last: items.length - 1, describe }

		const step = stepFor(event.key)

		// The lift of the last write, not the last render, so a second key in the same tick
		// carries the item that the first one lifted.
		if (readLifted() === id) carry(step, at)
		else if (index !== -1) navigate(step, at)
	})

	const menuMoves = useStableEvent((id: string): ReorderMove[] => {
		const { items, getKey } = options

		const index = items.findIndex((item) => getKey(item) === id)

		if (index === -1) return []

		return REORDER_MOVES.filter((move) => moveTarget(move, index, items.length - 1) !== index)
	})

	const menuMove = useStableEvent((id: string, move: ReorderMove, name: string) => {
		const { items, getKey, onReorder, enabled } = options

		const index = items.findIndex((item) => getKey(item) === id)

		if (!onReorder || !enabled || index === -1) return

		const target = moveTarget(move, index, items.length - 1)

		if (target === index) return

		onReorder(moveItem(items, index, target), id, target)

		announce(movedText(intl, name, { position: target + 1, total: items.length }), {
			assertive: true,
		})
	})

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur, menuMoves, menuMove }
}
