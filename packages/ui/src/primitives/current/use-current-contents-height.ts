'use client'

import { type RefObject, useEffect, useState } from 'react'

/**
 * Tracks the height of the `[data-current]` child of `ref` via `ResizeObserver`,
 * re-attaching when the data-current target changes. Returns `undefined` until
 * the first measurement, and stops observing when `enabled` is false.
 */
export function useCurrentContentsHeight(
	ref: RefObject<HTMLElement | null>,
	enabled: boolean,
): number | undefined {
	const [height, setHeight] = useState<number | undefined>(undefined)

	useEffect(() => {
		const element = ref.current

		if (!element || !enabled) return

		// Track every `data-current` child's height; report the tallest. When the
		// context value is undefined, all panels are `data-current` and stacked.
		const heights = new Map<Element, number>()

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) heights.set(entry.target, entry.contentRect.height)

			let max = 0

			for (const value of heights.values()) max = Math.max(max, value)

			setHeight(max)
		})

		const observe = () => {
			resizeObserver.disconnect()

			heights.clear()

			for (const child of element.children) {
				if (child.hasAttribute('data-current')) resizeObserver.observe(child)
			}
		}

		observe()

		const mutationObserver = new MutationObserver(observe)

		mutationObserver.observe(element, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-current'],
		})

		return () => {
			resizeObserver.disconnect()
			mutationObserver.disconnect()
		}
	}, [ref, enabled])

	return height
}
