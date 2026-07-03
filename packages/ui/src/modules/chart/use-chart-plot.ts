'use client'

import { type RefObject, useCallback, useRef, useState } from 'react'
import { useResizeObserver } from '../../hooks/use-resize-observer'

/**
 * Resolves a chart frame's drawing size, measuring only the dimensions the
 * frame actually consumes so a resize re-renders it only when it must. An
 * explicit `width` is returned as-is with no measurement — the deterministic
 * path for fixed frames, SSR output, and tests — otherwise the container's
 * width is measured through `ResizeObserver` and the chart fills it. The
 * container's height is measured only when `measureHeight` is set, for the
 * free-form (`aspectRatio={false}`) case where the chart fills whatever box
 * its consumer sizes; a derived or fixed height ignores it, so tracking it
 * would re-render the frame on every resize for a value the sizing discards.
 * A frame whose size is fully fixed by props measures nothing and observes
 * nothing, so a resize never reaches it.
 *
 * @param width - An explicit drawing width, or `undefined` to fill and measure
 * the container.
 * @param measureHeight - Track the container's height for the free-form case;
 * leave `false` when the height is derived from the width or fixed.
 * @returns The wrapper `ref` to attach, the resolved `width`, and the measured
 * container `height` — an unmeasured axis stays `0`, which renders the frame
 * shell without marks for that first paint (server and client agree, so no
 * hydration mismatch).
 * @internal
 */
export function useChartPlot(
	width: number | undefined,
	measureHeight: boolean,
): {
	ref: RefObject<HTMLDivElement | null>
	width: number
	height: number
} {
	const ref = useRef<HTMLDivElement>(null)

	// Width feeds the fill/aspect sizing only when the consumer doesn't fix it.
	const measureWidth = width === undefined

	const [size, setSize] = useState({ width: 0, height: 0 })

	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		// Integer px, equality-guarded, so observer notifications can't churn
		// state. An axis the frame ignores stays 0 and never re-renders it.
		const next = {
			width: measureWidth ? Math.round(el.clientWidth) : 0,
			height: measureHeight ? Math.round(el.clientHeight) : 0,
		}

		setSize((current) =>
			current.width === next.width && current.height === next.height ? current : next,
		)
	}, [measureWidth, measureHeight])

	// Observe only when a measured axis feeds the sizing; a fully fixed frame
	// attaches no observer, so a resize never re-renders it.
	useResizeObserver(ref, measure, measureWidth || measureHeight)

	return { ref, width: width ?? size.width, height: size.height }
}
