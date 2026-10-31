'use client'

import { useAnimate } from 'motion/react'
import { useCallback } from 'react'
import { k } from '../../recipes/kata/active-indicator'

/**
 * Wires the press-feedback animation for an active-indicator host.
 *
 * @returns A `ref` to attach to the indicator span, and `tapHandlers` (pointer
 * down/up/leave) for the parent container. Press dips the indicator to `0.99`
 * scale and releases it back to `1` on the shared spring.
 * @see {@link ActiveIndicator}
 */
export function useActiveIndicator() {
	const [scope, animate] = useAnimate<HTMLSpanElement>()

	const onPointerDown = useCallback(() => {
		animate(scope.current, { scale: 0.99 }, k.spring)
	}, [animate, scope])

	const onPointerUp = useCallback(() => {
		animate(scope.current, { scale: 1 }, k.spring)
	}, [animate, scope])

	return {
		ref: scope,
		tapHandlers: { onPointerDown, onPointerUp, onPointerLeave: onPointerUp },
	}
}
