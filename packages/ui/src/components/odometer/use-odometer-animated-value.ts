'use client'

import { animate } from 'motion'
import { useEffect, useRef, useState } from 'react'

type UseAnimatedValueOptions = {
	value: number
	/** Animation duration in ms. Pass `0` to snap. @default 800 */
	duration?: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export function useOdometerAnimatedValue({
	value,
	duration = 800,
}: UseAnimatedValueOptions): number {
	const [display, setDisplay] = useState(value)

	const fromRef = useRef(value)

	useEffect(() => {
		const from = fromRef.current

		const to = value

		if (from === to) return

		if (duration <= 0) {
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
	}, [value, duration])

	return display
}
