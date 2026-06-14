'use client'

import { animate } from 'motion'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

type AnimatedValueOptions = {
	value: number
	/**
	 * Tween length in milliseconds; pass `0` to snap.
	 * @defaultValue 800
	 */
	duration?: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Tweens a display number from its current value toward `value` over `duration`
 * with an ease-out cubic curve, driving {@link Odometer}'s readout.
 *
 * @returns The current in-flight display value, re-rendering each animation frame.
 * @remarks
 * Client-only: runs `motion`'s `animate()` in an effect and reads the OS
 * reduced-motion preference directly (the tween runs outside any `MotionConfig`),
 * snapping straight to the target when motion is reduced or `duration <= 0`
 * (WCAG 2.3.3).
 * @internal
 */
export function useOdometerAnimatedValue({ value, duration = 800 }: AnimatedValueOptions): number {
	const [display, setDisplay] = useState(value)

	const fromRef = useRef(value)

	// `animate()` runs outside any MotionConfig; the hook reads the OS preference
	// directly and snaps to the target value under reduced motion (WCAG 2.3.3).
	const reduceMotion = useReducedMotion()

	useEffect(() => {
		const from = fromRef.current

		const to = value

		if (from === to) return

		if (duration <= 0 || reduceMotion) {
			fromRef.current = to

			setDisplay(to)

			return
		}

		const controls = animate(from, to, {
			duration: duration / 1000,
			ease: easeOutCubic,
			onUpdate: (latest) => {
				fromRef.current = latest

				setDisplay(latest)
			},
		})

		return () => controls.stop()
	}, [value, duration, reduceMotion])

	return display
}
