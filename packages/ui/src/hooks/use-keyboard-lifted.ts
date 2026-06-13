'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
 *
 * @param focus - Moves DOM focus to the item with the given id; invoked by
 * `refocus` on the next animation frame.
 * @returns `{ liftedId, setLiftedId, refocus, onBlur }`. `liftedId` is the
 * currently lifted item or `null`; `setLiftedId` toggles it; `refocus(id)`
 * refocuses after a reorder while suppressing the lift-clearing blur; `onBlur`
 * clears the lift unless a reorder is in flight.
 */
export function useKeyboardLifted(focus: (id: string) => void) {
	const [liftedId, setLiftedId] = useState<string | null>(null)

	const movingRef = useRef(false)

	const refocus = useCallback(
		(id: string) => {
			movingRef.current = true

			requestAnimationFrame(() => {
				focus(id)

				movingRef.current = false
			})
		},
		[focus],
	)

	const onBlur = useCallback(() => {
		if (movingRef.current) return

		setLiftedId(null)
	}, [])

	return { liftedId, setLiftedId, refocus, onBlur }
}
