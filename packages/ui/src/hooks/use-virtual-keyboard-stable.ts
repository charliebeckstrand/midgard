import { useCallback, useEffect, useRef } from 'react'

/** Defers a callback until the virtual keyboard has settled. Fires immediately on desktop or when the keyboard is already visible. */
export function useVirtualKeyboardStable() {
	const rafRef = useRef<number | null>(null)

	useEffect(
		() => () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		},
		[],
	)

	return useCallback((callback: () => void) => {
		if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

		rafRef.current = null

		const vv = window.visualViewport

		// No visual viewport API or not a touch device — fire now
		if (!vv || !('ontouchstart' in window)) {
			callback()

			return
		}

		// Keyboard already visible
		if (vv.height < window.innerHeight * 0.85) {
			callback()

			return
		}

		// Poll until the viewport height stabilises
		let lastHeight = vv.height

		let stableFrames = 0

		let totalFrames = 0

		const check = () => {
			totalFrames++

			const currentHeight = vv.height

			if (currentHeight === lastHeight) {
				stableFrames++
			} else {
				stableFrames = 0

				lastHeight = currentHeight
			}

			// 5 stable frames (~83 ms at 60 fps), bail after 1 s
			if (stableFrames >= 5 || totalFrames >= 60) {
				rafRef.current = null

				callback()

				return
			}

			rafRef.current = requestAnimationFrame(check)
		}

		rafRef.current = requestAnimationFrame(check)
	}, [])
}
