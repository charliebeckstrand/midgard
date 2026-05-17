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
		const el = ref.current

		if (!el || !enabled) return

		const ro = new ResizeObserver(([entry]) => {
			if (entry) setHeight(entry.contentRect.height)
		})

		// Observe the in-flow child (active content)
		const observe = () => {
			ro.disconnect()

			for (const child of el.children) {
				if (child.hasAttribute('data-current')) {
					ro.observe(child)

					break
				}
			}
		}

		observe()

		const mo = new MutationObserver(observe)

		// Watch only the dedicated data-current attribute — not `style`,
		// which would fire on every framer-motion animation frame.
		mo.observe(el, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-current'],
		})

		return () => {
			ro.disconnect()
			mo.disconnect()
		}
	}, [ref, enabled])

	return height
}
