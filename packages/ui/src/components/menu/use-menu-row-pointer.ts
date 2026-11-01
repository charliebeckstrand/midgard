'use client'

import { type PointerEvent, useCallback } from 'react'
import { useMenuPointer } from './context'

/**
 * The `pointermove` handler a menu row reports its arrivals through, for the
 * enclosing level to make of what it will. `subKey` marks the row a submenu's
 * parent, so settling on it opens that submenu.
 *
 * @remarks `pointermove` rather than `pointerenter`, for three reasons. A menu
 * opening under a resting cursor must not seize the row it happens to cover. A
 * pointer already parked on a row the keyboard has since roved off of still
 * takes the cursor back on the first nudge. The level reads a sweep's course off
 * the coordinates every move carries. Touch has no hover to express intent
 * with: a tap goes straight to selection, or to opening the submenu it lands
 * on.
 */
export function useMenuRowPointer(
	disabled: boolean | undefined,
	subKey?: string,
): (event: PointerEvent<HTMLElement>) => void {
	const { hoverRow } = useMenuPointer()

	return useCallback(
		(event: PointerEvent<HTMLElement>) => {
			if (disabled || event.pointerType === 'touch') return

			hoverRow(event.currentTarget, { x: event.clientX, y: event.clientY }, subKey)
		},
		[disabled, hoverRow, subKey],
	)
}
