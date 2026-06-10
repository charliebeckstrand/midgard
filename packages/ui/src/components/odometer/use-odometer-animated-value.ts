'use client'

import { animate } from 'motion'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

type AnimatedValueOptions = {
	value: number
	/** Animation duration in ms. Pass `0` to snap. @default 800 */
	duration?: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

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
