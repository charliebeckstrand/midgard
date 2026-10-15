'use client'

import { animate } from 'motion'
import { type MotionValue, useMotionValue } from 'motion/react'
import { useEffect, useEffectEvent } from 'react'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'

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
 * @returns A motion value that holds the in-flight display number. Motion
 * writes each frame to the element that renders it, so a tween causes no React
 * render.
 * @remarks
 * Client-only. It runs `motion`'s `animate()` in an effect and reads the OS
 * reduced-motion preference directly, because the tween runs outside any
 * `MotionConfig`. It snaps straight to the target when motion is reduced or
 * `duration <= 0` (WCAG 2.3.3). A new target starts from the in-flight number,
 * so an interrupted tween continues from where it is. A running tween keeps its
 * length, and a new `duration` applies to the next target. A change to
 * `duration <= 0` snaps a running tween, as reduced motion does.
 * @internal
 */
export function useOdometerAnimatedValue({
	value,
	duration = 800,
}: AnimatedValueOptions): MotionValue<number> {
	const display = useMotionValue(value)

	// `animate()` runs outside any MotionConfig; the hook reads the OS preference
	// directly and snaps to the target value under reduced motion (WCAG 2.3.3).
	const reduceMotion = usePrefersReducedMotion()

	// A duration of 0 or less asks for no tween, as reduced motion does. The flag
	// is a dependency, so a change to it snaps a running tween.
	const instant = duration <= 0 || reduceMotion

	// An effect event reads the newest `duration` but is not a dependency, so a
	// new length does not restart a running tween.
	const readDuration = useEffectEvent(() => duration)

	useEffect(() => {
		if (display.get() === value) return

		if (instant) {
			display.jump(value)

			return
		}

		const controls = animate(display, value, {
			duration: readDuration() / 1000,
			ease: easeOutCubic,
		})

		return () => controls.stop()
	}, [display, value, instant])

	return display
}
