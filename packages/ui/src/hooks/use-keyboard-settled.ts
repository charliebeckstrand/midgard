import { useCallback, useEffect, useRef } from 'react'

/** Defers a callback until the virtual keyboard has settled. Fires immediately on desktop or when the keyboard is already visible. */
export function useKeyboardSettled() {
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

		// Poll until the viewport height stabilises after the keyboard starts appearing
		const initialHeight = vv.height

		let lastHeight = initialHeight

		let heightChanged = false

		let stableFrames = 0

		let totalFrames = 0

		const check = () => {
			totalFrames++

			const currentHeight = vv.height

			if (!heightChanged && currentHeight !== initialHeight) {
				heightChanged = true
			}

			if (currentHeight === lastHeight) {
				// Only count stable frames after the keyboard has started moving
				if (heightChanged) stableFrames++
			} else {
				stableFrames = 0

				lastHeight = currentHeight
			}

			// 5 stable frames (~83 ms at 60 fps) after keyboard moves, bail after 1 s
			if ((heightChanged && stableFrames >= 5) || totalFrames >= 60) {
				rafRef.current = null

				callback()

				return
			}

			rafRef.current = requestAnimationFrame(check)
		}

		rafRef.current = requestAnimationFrame(check)
	}, [])
}
