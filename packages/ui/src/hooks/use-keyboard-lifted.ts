'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
 *
 * @param focus - Moves DOM focus to the item with the given id; invoked by
 * `refocus` on the next animation frame. A later `refocus` replaces a pending
 * frame, and an unmount cancels it.
 * @returns `{ liftedId, setLiftedId, refocus, onBlur }`. `liftedId` is the
 * currently lifted item or `null`; `setLiftedId` toggles it. `refocus(id)`
 * refocuses after a reorder while suppressing the lift-clearing blur; `onBlur`
 * clears the lift unless a reorder is in flight.
 */
export function useKeyboardLifted(focus: (id: string) => void) {
	const [liftedId, setLiftedId] = useState<string | null>(null)

	const movingRef = useRef(false)

	// The pending refocus frame. A new reorder replaces it, and an unmount
	// cancels it, so no frame moves focus after the list is gone.
	const frameRef = useRef<number | null>(null)

	const refocus = useCallback(
		(id: string) => {
			movingRef.current = true

			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)

			frameRef.current = requestAnimationFrame(() => {
				frameRef.current = null

				focus(id)

				movingRef.current = false
			})
		},
		[focus],
	)

	useEffect(
		() => () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
		},
		[],
	)

	const onBlur = useCallback(() => {
		if (movingRef.current) return

		setLiftedId(null)
	}, [])

	return { liftedId, setLiftedId, refocus, onBlur }
}
