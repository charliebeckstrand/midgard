'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { announce } from '../core'
import { reorderMessages } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { useAnimationFrame } from './use-animation-frame'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
 *
 * @param focus - Moves DOM focus to the item with the given id; invoked by
 * `refocus` on the next animation frame. A later `refocus` replaces a pending
 * frame, and an unmount cancels it.
 * @param enabled - Whether the surface takes a lift. When it turns false, the
 * lift drops before paint. A disabled surface swaps or disables its handle, so
 * focus leaves the handle with no blur, and a lift that stays would move the
 * item on the first arrow after the surface turns enabled again.
 * @returns
 * - `liftedId`: the lifted item of the last render, or `null`.
 * - `readLifted`: the lifted item of the last write. A second key in the same
 *   tick reads the lift of the first. It keeps its identity.
 * - `setLiftedId`: sets the lift. It writes `readLifted` before the commit.
 * - `toggleLift(id, describe)`: lifts `id`, or drops it when it is lifted. It
 *   announces "Picked up" or "Dropped" with the text that `describe` gives, in
 *   the language of the reader. A surface with this lift model describes its
 *   handles with `reorderMessages.liftInstructions`.
 * - `drop(describe)`: drops the lift and announces "Dropped".
 * - `refocus(id)`: refocuses after a reorder and keeps the lift through the blur.
 * - `onBlur`: clears the lift unless a reorder is in flight.
 */
export function useKeyboardLifted(focus: (id: string) => void, enabled: boolean) {
	const intl = useIntl()

	const [liftedId, setLiftedState] = useState<string | null>(null)

	const liftedRef = useRef<string | null>(null)

	const setLiftedId = useCallback((id: string | null) => {
		liftedRef.current = id

		setLiftedState(id)
	}, [])

	const readLifted = useCallback(() => liftedRef.current, [])

	// A layout effect, so the frame that shows the disabled surface shows no lift.
	useLayoutEffect(() => {
		if (!enabled) setLiftedId(null)
	}, [enabled, setLiftedId])

	const toggleLift = useCallback(
		(id: string, describe: () => string) => {
			const lifting = liftedRef.current !== id

			setLiftedId(lifting ? id : null)

			const subject = describe()

			announce(
				lifting
					? `${intl.formatMessage(reorderMessages.pickedUp, { subject })} ${intl.formatMessage(reorderMessages.liftHint)}`
					: intl.formatMessage(reorderMessages.dropped, { subject }),
				{ assertive: true },
			)
		},
		[setLiftedId, intl],
	)

	const drop = useCallback(
		(describe: () => string) => {
			setLiftedId(null)

			announce(intl.formatMessage(reorderMessages.dropped, { subject: describe() }), {
				assertive: true,
			})
		},
		[setLiftedId, intl],
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
