'use client'

import { useEffect, useRef, useState } from 'react'
import { RESIZE_SETTLE_MS } from '../../primitives/plot'

/**
 * A generation key for a chart's animated marks: it bumps once when the
 * frame first gains a width (the mount reveal) and once more each time a
 * resize settles, and never during the resize itself.
 *
 * Keying the animated subtree by this value remounts it — replaying the
 * reveal — only on those two beats. Between them the marks keep their stable
 * keys and animate to their new geometry without restarting; without this the
 * charts replayed on every intermediate `ResizeObserver` frame.
 *
 * @returns The current generation, or `0` while `animate` is off or the width
 * is still unmeasured (nothing to key).
 * @internal
 */
export function useChartAnimationKey(width: number, animate: boolean): number {
	const [generation, setGeneration] = useState(0)

	const settledWidth = useRef(0)

	useEffect(() => {
		if (!animate || width === 0) return

		// First real width: reveal immediately, no settle wait.
		if (settledWidth.current === 0) {
			settledWidth.current = width

			setGeneration((value) => value + 1)

			return
		}

		if (width === settledWidth.current) return

		// A later width change: debounce so rapid resize frames collapse into a
		// single replay once the width holds steady.
		const timer = setTimeout(() => {
			settledWidth.current = width

			setGeneration((value) => value + 1)
		}, RESIZE_SETTLE_MS)

		return () => clearTimeout(timer)
	}, [width, animate])

	return generation
}
