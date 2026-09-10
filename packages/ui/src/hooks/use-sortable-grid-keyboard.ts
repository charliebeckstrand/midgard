'use client'

import { arrayMove } from '@dnd-kit/sortable'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { accessibleName, announce, querySlot } from '../core'
import { clamp } from '../utilities'
import { useKeyboardLifted } from './use-keyboard-lifted'

/**
 * Columns the container currently lays out, read from its resolved
 * `grid-template-columns` — `"288px 288px 288px"` is three.
 *
 * Measured at keypress rather than tracked: the count changes with the
 * breakpoint AND with the container's own width, so a stored value is stale
 * exactly when a resize happens between renders. Reading it per keystroke costs
 * one style resolution on a deliberate user action.
 *
 * Falls back to 1 for a container that is not a grid (or a jsdom that resolves
 * nothing), which degrades the vertical step to the horizontal one — arrows
 * still move the card, just one position at a time.
 */
function columnCount(container: HTMLElement | null): number {
	if (!container || typeof window === 'undefined') return 1

	const tracks = window.getComputedStyle(container).gridTemplateColumns

	if (!tracks || tracks === 'none') return 1

	return tracks.split(/\s+/).filter(Boolean).length || 1
}

type SortableGridKeyboardOptions<T> = {
	/** Ordered items, in the same order the grid renders them. */
	items: T[]
	/** Stable key extractor, matching the ids given to `<SortableContext>`. */
	getKey: (item: T) => string
	/** Called with the next ordering. Omit to navigate without reordering. */
	onReorder?: (next: T[]) => void
	/** The grid element; scopes item lookups so two grids with overlapping ids don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
	/**
	 * `data-slot` naming each item element. Items must also carry
	 * `data-item-id="{key}"` and be focusable — that pair is how this hook finds
	 * and focuses them.
	 *
	 * @defaultValue 'sortable-grid-item'
	 */
	itemSlot?: string
}

/**
 * Keyboard reordering for a WRAPPING grid of sortable items, the two-axis
 * counterpart to the list's own keyboard model (and `useKanbanKeyboard`): Space
 * lifts, arrows move, Escape or Enter drops, and every step is announced.
 *
 * @remarks
 * Left/Right step by one position; Up/Down step by a full row, so a card moves
 * the way it looks like it should rather than crawling through reading order.
 * Both steps clamp at the ends instead of wrapping — an Up on the first row is a
 * no-op, not a jump to the bottom of the grid.
 *
 * Pairs with dnd-kit's keyboard sensor turned OFF (`useSortableSensors({
 * keyboard: false })`). The sensor's own model hides the item behind a drag
 * overlay mid-move; this one reorders the real grid on each keystroke, so the
 * card the user is moving stays where they can see it.
 *
 * @returns `{ liftedId, setLiftedId, onItemKeyDown, onItemBlur }`: the lifted
 * item's key (or `null`) for the caller's lifted styling, a setter to clear it
 * when a pointer drag takes over, and the `keydown`/`blur` handlers to put on
 * each item.
 */
export function useSortableGridKeyboard<T>({
	items,
	getKey,
	onReorder,
	containerRef,
	itemSlot = 'sortable-grid-item',
}: SortableGridKeyboardOptions<T>) {
	const focusItem = useCallback(
		(id: string) => {
			querySlot(containerRef.current, itemSlot, 'item-id', id)?.focus()
		},
		[containerRef, itemSlot],
	)

	const itemName = useCallback(
		(id: string) => accessibleName(querySlot(containerRef.current, itemSlot, 'item-id', id)),
		[containerRef, itemSlot],
	)

	const {
		liftedId,
		setLiftedId,
		refocus: refocusItem,
		onBlur: onItemBlur,
	} = useKeyboardLifted(focusItem)

	/** Item's 1-based position and the total, for announcements. */
	const locate = useCallback(
		(id: string) => {
			const index = items.findIndex((item) => getKey(item) === id)

			return index === -1 ? null : { position: index + 1, count: items.length }
		},
		[items, getKey],
	)

	/** How far a key moves in the flat order: ±1 across, ±one row down or up. */
	const stepFor = useCallback(
		(key: string): number | null => {
			switch (key) {
				case 'ArrowRight':
					return 1
				case 'ArrowLeft':
					return -1
				case 'ArrowDown':
					return columnCount(containerRef.current)
				case 'ArrowUp':
					return -columnCount(containerRef.current)
				default:
					return null
			}
		},
		[containerRef],
	)

	const focusByStep = useCallback(
		(id: string, step: number | 'start' | 'end') => {
			const index = items.findIndex((item) => getKey(item) === id)

			if (index === -1) return false

			const target =
				step === 'start'
					? 0
					: step === 'end'
						? items.length - 1
						: clamp(index + step, 0, items.length - 1)

			if (target === index) return false

			const item = items[target]

			if (item === undefined) return false

			focusItem(getKey(item))

			return true
		},
		[items, getKey, focusItem],
	)

	const moveByStep = useCallback(
		(id: string, step: number) => {
			if (!onReorder) return

			const index = items.findIndex((item) => getKey(item) === id)

			if (index === -1) return

			// Clamped, not dropped: a Right on the last card of a row should still
			// reach the next row, and a Down from the bottom row should land on the
			// last position rather than doing nothing.
			const target = clamp(index + step, 0, items.length - 1)

			if (target === index) return

			onReorder(arrayMove(items, index, target))

			announce(`${itemName(id)} moved to position ${target + 1} of ${items.length}.`, {
				assertive: true,
			})

			refocusItem(id)
		},
		[items, getKey, onReorder, itemName, refocusItem],
	)

	const toggleLift = useCallback(
		(id: string) => {
			const lifting = liftedId !== id

			setLiftedId(lifting ? id : null)

			const where = locate(id)

			const position = where ? `, position ${where.position} of ${where.count}` : ''

			announce(
				lifting
					? `Picked up ${itemName(id)}${position}. Use arrow keys to move, Enter to drop.`
					: `Dropped ${itemName(id)}${position}.`,
				{ assertive: true },
			)
		},
		[liftedId, setLiftedId, locate, itemName],
	)

	/** Not lifted: arrows walk focus across the grid, Home/End jump to its ends. */
	const navigate = useCallback(
		(id: string, event: KeyboardEvent, step: number | null) => {
			if (step !== null) {
				if (focusByStep(id, step)) event.preventDefault()

				return
			}

			if (event.key !== 'Home' && event.key !== 'End') return

			if (focusByStep(id, event.key === 'Home' ? 'start' : 'end')) event.preventDefault()
		},
		[focusByStep],
	)

	/** Lifted: arrows move the card, Enter or Escape puts it down. */
	const carry = useCallback(
		(id: string, event: KeyboardEvent, step: number | null) => {
			if (step !== null) {
				event.preventDefault()

				moveByStep(id, step)

				return
			}

			if (event.key !== 'Escape' && event.key !== 'Enter') return

			event.preventDefault()

			// Reaching here means this item is the lifted one, so the toggle is the drop —
			// same state change, same announcement.
			toggleLift(id)
		},
		[moveByStep, toggleLift],
	)

	const onItemKeyDown = useCallback(
		(id: string, event: KeyboardEvent) => {
			// A modified arrow is a browser or OS gesture, never a move.
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

			if (event.key === ' ') {
				event.preventDefault()

				toggleLift(id)

				return
			}

			const step = stepFor(event.key)

			if (liftedId === id) carry(id, event, step)
			else navigate(id, event, step)
		},
		[liftedId, stepFor, toggleLift, carry, navigate],
	)

	return { liftedId, setLiftedId, onItemKeyDown, onItemBlur }
}
