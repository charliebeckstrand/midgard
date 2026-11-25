'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { announce } from '../core/announcer'
import { reorderMessages } from '../primitives/intl/intl-reorder'
import { useIntl } from '../primitives/intl/use-intl'
import { useAnimationFrame } from './use-animation-frame'

/**
 * Lifted-item state for keyboard reordering. Space toggles an item's "lifted"
 * id; blur drops it. `refocus` restores focus on the frame after a reorder
 * re-renders the DOM; blurs it causes keep the lifted state.
 *
 * Each step of a lift commits, so Enter, Space, and a blur keep the moves.
 * Escape cancels (APG grabbed-element pattern): a lift holds the order of the
 * surface at its start, `O`, and `takeOrigin` gives it back after a move. The
 * surface then reports that order, as a pointer drag cancel does.
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
 * - `toggleLift(id, describe, origin)`: lifts `id`, or drops it when it is
 *   lifted. It announces "Picked up" or "Dropped" with the text that `describe`
 *   gives, in the language of the reader. A lift holds `origin`, the order of
 *   the surface before the lift. Without it, Escape only drops. A surface with this lift model describes its
 *   handles with `reorderMessages.liftInstructions`.
 * - `markMoved()`: records that a step of the lift committed a move.
 * - `takeOrigin()`: the `origin` of the lift when a step moved the item, else
 *   `null`. It drops the lift and announces nothing, so the caller reports the
 *   origin and announces the return. With `null`, the caller drops.
 * - `drop(describe)`: drops the lift and announces "Dropped".
 * - `refocus(id)`: refocuses after a reorder and keeps the lift through the blur.
 * - `onBlur`: clears the lift unless a reorder is in flight.
 */
export function useKeyboardLifted<O>(focus: (id: string) => void, enabled: boolean) {
	const intl = useIntl()

	const [liftedId, setLiftedState] = useState<string | null>(null)

	const liftedRef = useRef<string | null>(null)

	// The order of the surface at the start of the lift, and whether a step has
	// moved the item since. A new lift or a drop replaces it.
	const originRef = useRef<{ value: O; moved: boolean } | null>(null)

	const setLiftedId = useCallback((id: string | null) => {
		liftedRef.current = id

		originRef.current = null

		setLiftedState(id)
	}, [])

	const readLifted = useCallback(() => liftedRef.current, [])

	// A layout effect, so the frame that shows the disabled surface shows no lift.
	useLayoutEffect(() => {
		if (!enabled) setLiftedId(null)
	}, [enabled, setLiftedId])

	const toggleLift = useCallback(
		(id: string, describe: () => string, origin?: O) => {
			const lifting = liftedRef.current !== id

			setLiftedId(lifting ? id : null)

			if (lifting && origin !== undefined) originRef.current = { value: origin, moved: false }

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

	const markMoved = useCallback(() => {
		if (originRef.current) originRef.current.moved = true
	}, [])

	const takeOrigin = useCallback((): O | null => {
		const origin = originRef.current

		if (!origin?.moved) return null

		setLiftedId(null)

		return origin.value
	}, [setLiftedId])

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

	return {
		liftedId,
		readLifted,
		setLiftedId,
		toggleLift,
		drop,
		markMoved,
		takeOrigin,
		refocus,
		onBlur,
	}
}
