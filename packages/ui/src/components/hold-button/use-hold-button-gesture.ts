'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { RESET_DURATION } from './hold-button-constants'

export type HoldGestureOptions = {
	duration: number
	disabled: boolean | undefined
	onComplete?: () => void
	onHoldStart?: () => void
	onHoldCancel?: () => void
}

export function useHoldButtonGesture({
	duration,
	disabled,
	onComplete,
	onHoldStart,
	onHoldCancel,
}: HoldGestureOptions) {
	const fillRef = useRef<HTMLSpanElement>(null)

	const holdingRef = useRef(false)

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// The fill growing over `duration` is essential feedback — it gates an
	// irreversible action in real time, so it animates regardless (2.3.3
	// essential exception). The snap-back reset is decorative, so collapse it to
	// an instant under prefers-reduced-motion.
	const reduceMotion = useReducedMotion()

	const resetDuration = reduceMotion ? 0 : RESET_DURATION

	const setFill = (target: number, ms: number) => {
		const fill = fillRef.current

		if (!fill) return

		fill.style.transition = `transform ${ms}ms linear`

		fill.style.transform = `scaleX(${target})`
	}

	const clearTimer = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)

			timerRef.current = null
		}
	}

	const start = () => {
		if (disabled || holdingRef.current) return

		holdingRef.current = true

		setFill(1, duration)

		clearTimer()

		timerRef.current = setTimeout(() => {
			timerRef.current = null

			holdingRef.current = false

			setFill(0, resetDuration)

			onComplete?.()
		}, duration)

		onHoldStart?.()
	}

	const cancel = () => {
		if (!holdingRef.current) return

		holdingRef.current = false

		clearTimer()

		setFill(0, resetDuration)

		onHoldCancel?.()
	}

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current)
		},
		[],
	)

	// If the button is disabled mid-hold, the pending timer would still fire
	// and call onComplete on a button the consumer just turned off. Call cancel
	// via a ref so the effect doesn't need to depend on onHoldCancel (which
	// would re-run the effect on every prop change).
	const cancelRef = useRef(cancel)

	cancelRef.current = cancel

	useEffect(() => {
		if (disabled) cancelRef.current()
	}, [disabled])

	return { fillRef, start, cancel }
}
