'use client'

import { type PointerEvent, useMemo, useRef, useState } from 'react'
import { holdTextSelection } from '../utilities/hold-text-selection'
import { createPressOwner, type isPrimaryPress } from '../utilities/primary-press'
import { useStableEvent } from './use-stable-event'
import { useTimeout } from './use-timeout'
import { TOUCH_SLOP } from './use-touch-tap'

/** The press that a hold times: its pointer, the viewport point where it landed, and its target. @internal */
export type TouchPress = { id: number; x: number; y: number; target: EventTarget | null }

/** The controls {@link useTouchHold} gives. Each function keeps its identity. @internal */
export type TouchHold = {
	/**
	 * Starts a hold from a `pointerdown`. A press that cannot start a gesture (see
	 * {@link isPrimaryPress}), or a press while another pointer holds, changes nothing. The caller
	 * filters the pointer type.
	 *
	 * @returns Whether the hold started.
	 */
	start: (event: PointerEvent, delay: number) => boolean
	/**
	 * Ends a pending hold whose pointer moves past {@link TOUCH_SLOP}. Such a press is a scroll or
	 * a drag. A hold that fired is not changed.
	 *
	 * @returns Whether the move ended the hold.
	 */
	move: (event: PointerEvent) => boolean
	/** Clears the timer and forgets the press. */
	cancel: () => void
	/** Whether a press is held, pending or fired. With a pointer id, whether that pointer holds. */
	active: (pointerId?: number) => boolean
	/** Whether the timer is set and has not fired or been cleared. */
	pending: () => boolean
}

/**
 * Times a touch hold: the arm and the cancel phase of a long press.
 *
 * A press arms a timer and keeps the point where it landed. A move past {@link TOUCH_SLOP} before
 * the timer fires ends the hold, because the finger scrolls or drags. When the timer fires,
 * `onHold` gets the press. The press stays held until {@link TouchHold.cancel}, so the caller can
 * match the moves and the lift of the same pointer. While the touch holds, the page selects no
 * text (see {@link holdTextSelection}).
 *
 * What the hold does when it fires, and what happens to the click that the lift makes, stay with
 * each caller. {@link useTouchTap} finds the tap, which is the press that lifts before a hold.
 *
 * @param onHold - Called with the press when the hold fires. It can change on each render.
 * @returns A {@link TouchHold} that keeps its identity.
 * @internal
 */
export function useTouchHold(onHold: (press: TouchPress) => void): TouchHold {
	// The timer clears on unmount, so a hold does not fire at a gone surface.
	const timer = useTimeout()

	const press = useRef<TouchPress | null>(null)

	// The pointer that holds. While a pen holds, the touch of a palm is also a primary press.
	const [owner] = useState(createPressOwner)

	const hold = useStableEvent(onHold)

	return useMemo<TouchHold>(() => {
		const cancel = () => {
			timer.clear()

			press.current = null

			owner.release()
		}

		return {
			start: (event, delay) => {
				// A second finger or a palm leaves the held press alone, so a pinch does not end it.
				if (!owner.claim(event)) return false

				holdTextSelection(event)

				const current = {
					id: event.pointerId,
					x: event.clientX,
					y: event.clientY,
					target: event.target,
				}

				press.current = current

				timer.set(() => hold(current), delay)

				return true
			},
			move: (event) => {
				const current = press.current

				if (current === null || !owner.owns(event) || !timer.pending()) return false

				if (Math.hypot(event.clientX - current.x, event.clientY - current.y) <= TOUCH_SLOP) {
					return false
				}

				cancel()

				return true
			},
			cancel,
			active: (pointerId) => (pointerId === undefined ? owner.held() : owner.owns({ pointerId })),
			pending: timer.pending,
		}
	}, [timer, hold, owner])
}
