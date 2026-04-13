import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a function that delays its callback until the virtual keyboard
 * has finished animating (i.e. the visual viewport height stops changing
 * between frames).
 *
 * On desktop or when the keyboard is already visible, fires immediately.
 */
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

		// No visual viewport API or not a touch device — fire immediately
		if (!vv || !('ontouchstart' in window)) {
			callback()

			return
		}

		// Keyboard is already visible (viewport significantly smaller than window)
		if (vv.height < window.innerHeight * 0.85) {
			callback()

			return
		}

		// Poll each frame until the viewport height stabilizes
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

			// 5 consecutive stable frames (~83ms at 60fps) or bail after 1 second
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
