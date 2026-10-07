'use client'

import { type RefObject, useCallback } from 'react'
import { accessibleName, querySlot } from '../../core'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useKeyboardReorder } from '../../hooks/use-keyboard-reorder'
import type { Orientation } from '../../types'

/** Accessible name of a list item, for announcements. @internal */
export const listItemName = (container: ParentNode | null, id: string) =>
	accessibleName(querySlot(container, 'list-item', 'item-id', id))

type Options<T> = {
	items: T[]
	getKey: (item: T) => string
	orientation: Orientation
	onReorder?: (next: T[]) => void
	/** List root; scopes item lookups so concurrent lists with overlapping ids don't cross-match. */
	containerRef: RefObject<HTMLElement | null>
}

/**
 * The step of a key along the list's axis, or `null` for a key off it. A horizontal list follows
 * the reading order, so its keys swap in RTL.
 *
 * @internal
 */
function listStep(key: string, orientation: Orientation, container: HTMLElement | null) {
	const next = orientation === 'horizontal' ? logicalArrowKey('ArrowRight', container) : 'ArrowDown'

	const previous =
		orientation === 'horizontal' ? logicalArrowKey('ArrowLeft', container) : 'ArrowUp'

	if (key === next) return 1

	return key === previous ? -1 : null
}

/**
 * Keyboard reordering for flat sortable lists. Space toggles "lifted" state,
 * arrow keys focus neighbors (or move the lifted item), Escape/Enter drops.
 * Pairs with `useReorderDrag`, which owns the pointer drag; mirrors
 * `useKanbanKeyboard`. The model is
 * `useKeyboardReorder`, with a step of one along the list's axis.
 */
export function useListKeyboard<T>({
	items,
	getKey,
	orientation,
	onReorder,
	containerRef,
}: Options<T>) {
	const focusItem = useCallback(
		(id: string) => {
			const row = querySlot(containerRef.current, 'list-item', 'item-id', id)

			// The row's stop is its content area when that area is activatable (a link or a
			// button is already focusable, so it takes the reorder keys and there is only one
			// Tab stop per row); otherwise the `<li>` itself holds them. `ListItem` decides
			// which, and the `tabindex` it wrote is what says so here.
			const content = row?.querySelector<HTMLElement>('[data-slot="list-item-content"][tabindex]')

			;(content ?? row)?.focus()
		},
		[containerRef],
	)

	return useKeyboardReorder({
		items,
		getKey,
		// The list reports the next order alone.
		onReorder: onReorder && ((next) => onReorder(next)),
		focusItem,
		itemName: (id) => listItemName(containerRef.current, id),
		stepFor: (key) => listStep(key, orientation, containerRef.current),
	})
}
