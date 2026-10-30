'use client'

import type { KeyboardEvent } from 'react'
import { announce } from '../core'
import { movedText, reorderSubject } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { clamp, moveItem } from '../utilities'
import { hasBrowserModifier } from '../utilities/modifier-keys'
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
	items: T[]
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

/**
 * The keyboard reorder model of a sortable list. Space lifts, a step key moves focus
 * or, when lifted, moves the item, Home and End jump to the ends, and Escape or Enter drops.
 * Each change is announced.
 *
 * @remarks
 * A step clamps at the ends and does not wrap. `onItemKeyDown` is a stable event: it keeps its
 * identity and reads the newest options. With `items` in its dependencies, the handler, and each
 * item that takes it, got a new identity for each move.
 *
 * @returns `{ liftedId, setLiftedId, onItemKeyDown, onItemBlur }`.
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
		refocus,
		onBlur: onItemBlur,
	} = useKeyboardLifted(options.focusItem, options.enabled)

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

		/** Lifted: a step or Home or End moves the item, and Escape or Enter drops it. */
		const carry = (step: number | null, at: ReorderTarget) => {
			const target = keyTarget(event.key, step, at)

			if (target === null) {
				if (event.key !== 'Escape' && event.key !== 'Enter') return

				event.preventDefault()

				drop(at.describe)

				return
			}

			event.preventDefault()

			if (!onReorder || at.index === -1 || target === at.index) return

			onReorder(moveItem(items, at.index, target), at.id, target)

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

			toggleLift(id, describe)

			return
		}

		const at = { id, index, last: items.length - 1, describe }

		const step = stepFor(event.key)

		// The lift of the last write, not the last render, so a second key in the same tick
		// carries the item that the first one lifted.
		if (readLifted() === id) carry(step, at)
		else if (index !== -1) navigate(step, at)
	})

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur }
}
