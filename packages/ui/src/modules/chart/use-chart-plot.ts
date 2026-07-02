'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import { useResizeObserver } from '../../hooks/use-resize-observer'

/** Stable empty target so an explicit width disables observation without re-subscribing. @internal */
const NO_ELEMENT: RefObject<Element | null> = { current: null }

/**
 * Resolves a chart frame's drawing width. An explicit `width` is returned
 * as-is with no measurement — the deterministic path for fixed frames, SSR
 * output, and tests. Omitted, the frame's container is measured through
 * `ResizeObserver` and the chart fills it.
 *
 * @returns The wrapper `ref` to attach and the resolved `width` — `0` until
 * an unmeasured container reports, which renders the frame shell without
 * marks for that first paint (server and client agree, so no hydration
 * mismatch).
 * @internal
 */
export function useChartPlot(width?: number): {
	ref: RefObject<HTMLDivElement | null>
	width: number
} {
	const ref = useRef<HTMLDivElement>(null)

	const [measured, setMeasured] = useState(0)

	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		// Integer px, equality-guarded, so observer notifications can't churn state.
		const next = Math.round(el.clientWidth)

		setMeasured((current) => (current === next ? current : next))
	}, [])

	useResizeObserver(width === undefined ? ref : NO_ELEMENT, measure)

	return { ref, width: width ?? measured }
}
