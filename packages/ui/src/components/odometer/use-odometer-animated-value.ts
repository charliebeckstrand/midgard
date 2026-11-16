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
	/**
	 * The least distance that a tween covers.
	 * @defaultValue 0
	 */
	minChange?: number
}

/**
 * The figure that a tween from `current` to `value` starts at, so that it
 * covers at least `minChange`. A nearer target starts `minChange` away from
 * it, on the side of `current`. When that start has the other sign from the
 * target, the tween starts on the other side of the target.
 */
function findStart(current: number, value: number, minChange: number): number {
	if (Math.abs(value - current) >= minChange) return current

	const side = Math.sign(current - value) || 1

	const start = value + side * minChange

	return Math.sign(start) === -Math.sign(value) ? value - side * minChange : start
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
 * `duration <= 0` snaps a running tween, as reduced motion does. With
 * `minChange`, a target nearer than `minChange` makes the number jump to a
 * start `minChange` away from the target, on the side of the current number,
 * and the tween runs from there (see `findStart`).
 * @internal
 */
export function useOdometerAnimatedValue({
	value,
	duration = 800,
	minChange = 0,
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

	// The least distance is read as the duration is, so a new value does not restart a running tween.
	const readMinChange = useEffectEvent(() => minChange)

	useEffect(() => {
		if (display.get() === value) return

		if (instant) {
			display.jump(value)

			return
		}

		display.jump(findStart(display.get(), value, readMinChange()))

		const controls = animate(display, value, {
			duration: readDuration() / 1000,
			ease: easeOutCubic,
		})

		return () => controls.stop()
	}, [display, value, instant])

	return display
}
