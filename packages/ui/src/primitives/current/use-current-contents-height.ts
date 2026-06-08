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

		const resizeObserver = new ResizeObserver(([entry]) => {
			if (entry) setHeight(entry.contentRect.height)
		})

		// Observe the active child (`data-current`).
		const observe = () => {
			resizeObserver.disconnect()

			for (const child of element.children) {
				if (child.hasAttribute('data-current')) {
					resizeObserver.observe(child)

					break
				}
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
