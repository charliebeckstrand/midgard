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

	// Always points at the latest `cancel` closure; read by the window guards
	// and the disabled effect below. Neither re-binds per render.
	const cancelRef = useRef<() => void>(() => {})

	// The fill animates unconditionally: it gates an irreversible action in
	// real time (WCAG 2.3.3 essential exception). The snap-back reset is
	// decorative and collapses to an instant under prefers-reduced-motion.
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

	// Window-level guards for a keyboard hold: Alt-Tab or tab-away routes the
	// keyup elsewhere, and the guards cancel the hold on focus loss. Stable
	// identities; add/remove pair across the per-render `start`/`cancel` closures.
	const guardsRef = useRef({
		blur: () => cancelRef.current(),
		visibility: () => {
			if (document.hidden) cancelRef.current()
		},
	})

	const attachGuards = () => {
		window.addEventListener('blur', guardsRef.current.blur)

		document.addEventListener('visibilitychange', guardsRef.current.visibility)
	}

	const detachGuards = () => {
		window.removeEventListener('blur', guardsRef.current.blur)

		document.removeEventListener('visibilitychange', guardsRef.current.visibility)
	}

	const start = () => {
		if (disabled || holdingRef.current) return

		holdingRef.current = true

		setFill(1, duration)

		clearTimer()

		attachGuards()

		timerRef.current = setTimeout(() => {
			timerRef.current = null

			holdingRef.current = false

			detachGuards()

			setFill(0, resetDuration)

			onComplete?.()
		}, duration)

		onHoldStart?.()
	}

	const cancel = () => {
		if (!holdingRef.current) return

		holdingRef.current = false

		clearTimer()

		detachGuards()

		setFill(0, resetDuration)

		onHoldCancel?.()
	}

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current)

			window.removeEventListener('blur', guardsRef.current.blur)

			document.removeEventListener('visibilitychange', guardsRef.current.visibility)
		},
		[],
	)

	cancelRef.current = cancel

	// Cancels any in-progress hold when `disabled` changes. The effect reads
	// `cancel` from the ref and depends only on `disabled`, not on `onHoldCancel`.
	useEffect(() => {
		if (disabled) cancelRef.current()
	}, [disabled])

	return { fillRef, start, cancel }
}
