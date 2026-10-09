'use client'

import { useCallback, useRef, useState } from 'react'
import { announce } from '../core'
import { useAnimationFrame } from './use-timeout'

/**
 * The dnd-kit `screenReaderInstructions` of a surface with the lift model of
 * {@link useKeyboardLifted}. The surface turns off the dnd-kit keyboard sensor,
 * so the default text of dnd-kit gives keys that do not apply.
 *
 * @internal
 */
export const LIFT_INSTRUCTIONS = {
	draggable:
		'To pick up an item, press Space. Use the arrow keys to move it, then press Space or Enter to drop it.',
}

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
 *
 * @param focus - Moves DOM focus to the item with the given id; invoked by
 * `refocus` on the next animation frame. A later `refocus` replaces a pending
 * frame, and an unmount cancels it.
 * @returns
 * - `liftedId`: the lifted item of the last render, or `null`.
 * - `readLifted`: the lifted item of the last write. A second key in the same
 *   tick reads the lift of the first. It keeps its identity.
 * - `setLiftedId`: sets the lift. It writes `readLifted` before the commit.
 * - `toggleLift(id, describe)`: lifts `id`, or drops it when it is lifted. It
 *   announces "Picked up" or "Dropped" with the text that `describe` gives.
 * * - `drop(describe)`: drops the lift and announces "Dropped".
 * - `refocus(id)`: refocuses after a reorder and keeps the lift through the blur.
 * - `onBlur`: clears the lift unless a reorder is in flight.
 */
export function useKeyboardLifted(focus: (id: string) => void) {
	const [liftedId, setLiftedState] = useState<string | null>(null)

	const liftedRef = useRef<string | null>(null)

	const setLiftedId = useCallback((id: string | null) => {
		liftedRef.current = id

		setLiftedState(id)
	}, [])

	const readLifted = useCallback(() => liftedRef.current, [])

	const toggleLift = useCallback(
		(id: string, describe: () => string) => {
			const lifting = liftedRef.current !== id

			setLiftedId(lifting ? id : null)

			announce(
				lifting
					? `Picked up ${describe()}. Use arrow keys to move, Enter to drop.`
					: `Dropped ${describe()}.`,
				{ assertive: true },
			)
		},
		[setLiftedId],
	)

	const drop = useCallback(
		(describe: () => string) => {
			setLiftedId(null)

			announce(`Dropped ${describe()}.`, { assertive: true })
		},
		[setLiftedId],
	)

	const movingRef = useRef(false)

	// The pending refocus frame. A new reorder replaces it, and an unmount
	// cancels it, so no frame moves focus after the list is gone.
	const frame = useAnimationFrame()

	const refocus = useCallback(
		(id: string) => {
			movingRef.current = true

			frame.set(() => {
				focus(id)

				movingRef.current = false
			})
		},
		[focus, frame],
	)

	const onBlur = useCallback(() => {
		if (movingRef.current) return

		setLiftedId(null)
	}, [setLiftedId])

	return { liftedId, readLifted, setLiftedId, toggleLift, drop, refocus, onBlur }
}
