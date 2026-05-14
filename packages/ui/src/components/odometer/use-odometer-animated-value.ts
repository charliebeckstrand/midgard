import { useEffect, useRef, useState } from 'react'

export type UseAnimatedValueOptions = {
	value: number
	/** Animation duration in ms. Pass `0` to snap. @default 800 */
	duration?: number
}

export function useOdometerAnimatedValue({
	value,
	duration = 800,
}: UseAnimatedValueOptions): number {
	const [display, setDisplay] = useState(value)

	const fromRef = useRef(value)

	const rafRef = useRef<number | null>(null)

	useEffect(() => {
		const from = fromRef.current

		const to = value

		if (from === to) return

		if (duration <= 0) {
			fromRef.current = to

			setDisplay(to)

			return
		}

		const start = performance.now()

		const tick = () => {
			const t = Math.min(1, (performance.now() - start) / duration)

			const eased = 1 - (1 - t) ** 3

			setDisplay(from + (to - from) * eased)

			if (t < 1) {
				rafRef.current = requestAnimationFrame(tick)
			} else {
				fromRef.current = to

				rafRef.current = null
			}
		}

		rafRef.current = requestAnimationFrame(tick)

		return () => {
			if (rafRef.current != null) {
				cancelAnimationFrame(rafRef.current)

				rafRef.current = null
			}

			fromRef.current = to
		}
	}, [value, duration])

	return display
}
