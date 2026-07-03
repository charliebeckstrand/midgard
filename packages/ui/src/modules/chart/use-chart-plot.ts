'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import { useResizeObserver } from '../../hooks/use-resize-observer'

/**
 * Resolves a chart frame's drawing size. An explicit `width` is returned
 * as-is with no measurement — the deterministic path for fixed frames, SSR
 * output, and tests. Omitted, the frame's container is measured through
 * `ResizeObserver` and the chart fills it. The container's height is always
 * measured too, for the free-form (`aspectRatio={false}`) case where the
 * chart fills whatever box its consumer sizes.
 *
 * @returns The wrapper `ref` to attach, the resolved `width`, and the
 * measured container `height` — each `0` until an unmeasured container
 * reports, which renders the frame shell without marks for that first paint
 * (server and client agree, so no hydration mismatch).
 * @internal
 */
export function useChartPlot(width?: number): {
	ref: RefObject<HTMLDivElement | null>
	width: number
	height: number
} {
	const ref = useRef<HTMLDivElement>(null)

	const [size, setSize] = useState({ width: 0, height: 0 })

	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		// Integer px, equality-guarded, so observer notifications can't churn state.
		const next = { width: Math.round(el.clientWidth), height: Math.round(el.clientHeight) }

		setSize((current) =>
			current.width === next.width && current.height === next.height ? current : next,
		)
	}, [])

	// Always observe: the width feeds the fill/aspect sizing (unless fixed), and
	// the height feeds the free-form case where the chart fills its container.
	useResizeObserver(ref, measure)

	return { ref, width: width ?? size.width, height: size.height }
}
