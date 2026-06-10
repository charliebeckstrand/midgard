'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
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
