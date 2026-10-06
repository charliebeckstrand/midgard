'use client'

import { animate, type ValueAnimationTransition } from 'motion'
import { useEffect, useEffectEvent, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/hold-button'

/**
 * Options for {@link useHoldButtonGesture}.
 * @internal
 */
export type HoldGestureOptions = {
	duration: number
	disabled: boolean | undefined
	onHoldComplete?: () => void
	onHoldStart?: () => void
	onHoldCancel?: () => void
}

/**
 * Press-and-hold gesture engine behind {@link HoldButton}: runs the completion
 * timer, drives the fill animation through Motion, and guards against focus loss.
 *
 * @returns `{ fillRef, start, cancel }` — `fillRef` attaches to the fill overlay
 * span the hook scales directly; `start` begins a hold; `cancel` aborts one in
 * progress. Both are idempotent against the current holding state.
 * @remarks
 * The fill animates unconditionally (WCAG 2.3.3 essential exception, gating an
 * irreversible action); only the decorative snap-back reset collapses to instant
 * under prefers-reduced-motion. Window-blur and visibility-change listeners
 * cancel a keyboard hold when focus leaves, since the keyup would otherwise route
 * elsewhere. Toggling `disabled` mid-hold cancels. Timers and listeners are torn
 * down on unmount.
 * @internal
 */
export function useHoldButtonGesture({
	duration,
	disabled,
	onHoldComplete,
	onHoldStart,
	onHoldCancel,
}: HoldGestureOptions) {
	const fillRef = useRef<HTMLSpanElement>(null)

	const holdingRef = useRef(false)

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// The fill animates unconditionally: it gates an irreversible action in
	// real time (WCAG 2.3.3 essential exception). The snap-back reset is
	// decorative and collapses to an instant under prefers-reduced-motion.
	const reduceMotion = usePrefersReducedMotion()

	const reset = reduceMotion ? { duration: 0 } : k.motion.reset

	// A new animation of the fill takes over from the one that runs, from the
	// scale that the fill paints now.
	const setFill = (target: number, transition: ValueAnimationTransition) => {
		const fill = fillRef.current

		if (!fill) return

		animate(fill, { transform: `scaleX(${target})` }, transition)
	}

	const clearTimer = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)

			timerRef.current = null
		}
	}

	// Window-level guards for a keyboard hold: Alt-Tab or tab-away routes the
	// keyup elsewhere, and the guards cancel the hold on focus loss. One
	// controller per hold aborts both together, so handler identity is free to
	// vary with the per-render `start`/`cancel` closures.
	const guardsRef = useRef<AbortController | null>(null)

	const attachGuards = () => {
		const controller = new AbortController()

		guardsRef.current = controller

		window.addEventListener('blur', () => cancelLatest(), { signal: controller.signal })

		document.addEventListener(
			'visibilitychange',
			() => {
				if (document.hidden) cancelLatest()
			},
			{ signal: controller.signal },
		)
	}

	const detachGuards = () => {
		guardsRef.current?.abort()

		guardsRef.current = null
	}

	const start = () => {
		if (disabled || holdingRef.current) return

		holdingRef.current = true

		setFill(1, { ...k.motion.hold, duration: duration / 1000 })

		clearTimer()

		attachGuards()

		timerRef.current = setTimeout(() => {
			timerRef.current = null

			holdingRef.current = false

			detachGuards()

			setFill(0, reset)

			onHoldComplete?.()
		}, duration)

		onHoldStart?.()
	}

	const cancel = () => {
		if (!holdingRef.current) return

		holdingRef.current = false

		clearTimer()

		detachGuards()

		setFill(0, reset)

		onHoldCancel?.()
	}

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current)

			guardsRef.current?.abort()
		},
		[],
	)

	// The latest `cancel` closure, as an effect event. The window guards above
	// name it before this declaration and call it at event time. The disabled
	// effect below reads it too, so neither re-binds per render.
	const cancelLatest = useEffectEvent(() => cancel())

	// Cancels any in-progress hold when `disabled` changes. The effect depends
	// only on `disabled`, not on `onHoldCancel`.
	useEffect(() => {
		if (disabled) cancelLatest()
	}, [disabled])

	return { fillRef, start, cancel }
}
