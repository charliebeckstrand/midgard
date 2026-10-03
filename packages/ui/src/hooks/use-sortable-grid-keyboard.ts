'use client'

import { type RefObject, useCallback } from 'react'
import { accessibleName, querySlot } from '../core'
import { logicalArrowKey } from './a11y/logical-arrow'
import { useKeyboardReorder } from './use-keyboard-reorder'

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

/**
 * How far a key moves in the flat order: ±1 across, ±one row down or up, or `null` for a key
 * that is not an arrow. The cards wrap in the reading order, so a horizontal step follows it.
 */
function stepFor(key: string, container: HTMLElement | null): number | null {
	switch (logicalArrowKey(key, container)) {
		case 'ArrowRight':
			return 1
		case 'ArrowLeft':
			return -1
		case 'ArrowDown':
			return columnCount(container)
		case 'ArrowUp':
			return -columnCount(container)
		default:
			return null
	}
}

/** Options for {@link useSortableGridKeyboard}: the items, the key extractor, the grid, and the reorder report. */
export type SortableGridKeyboardOptions<T> = {
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
 * Left/Right step by one position; Up/Down step by a full row. Thus a card
 * moves in the direction of the arrow and does not crawl through the reading
 * order.
 * The grid wraps in the reading order, so in a right-to-left layout Left is the
 * next position and Right the previous one.
 * Both steps clamp at the ends instead of wrapping — an Up on the first row is a
 * no-op, not a jump to the bottom of the grid. The model is the list's own,
 * `useKeyboardReorder`, with these steps.
 *
 * Pairs with dnd-kit's keyboard sensor turned OFF (`useSortableSensors({
 * keyboard: false })`). The sensor's own model hides the item behind a drag
 * overlay mid-move; this one reorders the real grid on each keystroke, so the
 * card the user is moving stays where they can see it. Pairs with
 * `useSortableList({ layout: 'grid' })` for the pointer side.
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
	const findItem = useCallback(
		(id: string) => querySlot(containerRef.current, itemSlot, 'item-id', id),
		[containerRef, itemSlot],
	)

	const focusItem = useCallback((id: string) => findItem(id)?.focus(), [findItem])

	return useKeyboardReorder({
		items,
		getKey,
		onReorder,
		focusItem,
		itemName: (id) => accessibleName(findItem(id)),
		stepFor: (key) => stepFor(key, containerRef.current),
	})
}
