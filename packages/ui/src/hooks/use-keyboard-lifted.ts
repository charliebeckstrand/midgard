'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id, blur drops it — except blurs caused by the hook's own `refocus`, which
 * restores focus on the next frame after a reorder re-renders the DOM and must
 * not clear the lifted state mid-move.
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
