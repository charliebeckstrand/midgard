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
		// context value is undefined, all panels are `data-current` and stacked, so
		// measuring only the first would clip the taller ones.
		const heights = new Map<Element, number>()

		const resizeObserver = new ResizeObserver((entries) => {
			// Border-box, not contentRect: the content box excludes panel
			// padding/border, under-sizing the container and clipping the bottom.
			for (const entry of entries) {
				const borderBox = entry.borderBoxSize?.[0]

				heights.set(
					entry.target,
					borderBox ? borderBox.blockSize : entry.target.getBoundingClientRect().height,
				)
			}

			let max = 0

			for (const value of heights.values()) max = Math.max(max, value)

			setHeight(max)
		})

		// Observe every active child (`data-current`).
		const observe = () => {
			resizeObserver.disconnect()

			heights.clear()

			for (const child of element.children) {
				if (child.hasAttribute('data-current')) resizeObserver.observe(child)
			}
		}

		observe()

		const mutationObserver = new MutationObserver(observe)

		// Watch only the `data-current` attribute, not `style`.
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
