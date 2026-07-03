'use client'

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { type FrameSizing, RESIZE_SETTLE_MS, resolveFrameSizing } from './plot-sizing'

/**
 * Resolves a plot frame's drawing size from its {@link FrameSizing} policy,
 * measuring only the dimensions the policy consumes so a resize re-renders
 * the frame only when it must. An explicit `width` is returned as-is with no
 * measurement — the deterministic path for fixed frames, SSR output, and
 * tests — otherwise the container's width is measured and the frame fills
 * it. The container's height is measured only under a `fill` policy; `fixed`
 * and `aspect` heights ignore it, so tracking it would re-render the frame
 * on every resize for a value the policy discards. A frame whose size is
 * fully fixed by props observes nothing at all, so a resize never reaches
 * it.
 *
 * Live resizes re-render once per settle, not per frame: after the first
 * real measurement, observer notifications collapse into a single re-measure
 * once the box holds steady for {@link RESIZE_SETTLE_MS}. Mid-drag the SVG
 * scales in CSS under its last-settled `viewBox` — uniformly under an
 * `aspect` policy, whose CSS `aspect-ratio` box keeps the `viewBox`'s shape —
 * then the settle re-render redraws it crisp. Only the first measurement of
 * a real box is immediate, so an initial reveal (mount, un-hiding) never
 * waits out the settle window.
 *
 * @param width - An explicit drawing width, or `undefined` to fill and
 * measure the container.
 * @param sizing - The frame's sizing policy, from `chartFrameSizing` or
 * `mapFrameSizing`.
 * @returns The wrapper `ref` to attach and the resolved drawing box — an
 * unmeasured `width` stays `0`, which renders the frame shell without marks
 * for that first paint (server and client agree, so no hydration mismatch).
 * @internal
 */
export function usePlotFrame(
	width: number | undefined,
	sizing: FrameSizing,
): {
	ref: RefObject<HTMLDivElement | null>
	width: number
	height: number
	reserveAspect: number | null
} {
	const ref = useRef<HTMLDivElement>(null)

	// The policy decides what the frame consumes: the width feeds the
	// fill/aspect sizing unless the consumer fixes it, and the container
	// height feeds only the free-form `fill` case.
	const measureWidth = width === undefined

	const measureHeight = sizing.mode === 'fill'

	const [size, setSize] = useState({ width: 0, height: 0 })

	// True while a real (nonzero) box is stored: the next observer tick is a
	// live resize to settle, not a reveal to show immediately. Measuring a
	// hidden frame (0×0) flips it back, so re-reveals are immediate too.
	const settled = useRef(false)

	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		// Integer px, equality-guarded, so observer notifications can't churn
		// state. An axis the policy ignores stays 0 and never re-renders it.
		const next = {
			width: measureWidth ? Math.round(el.clientWidth) : 0,
			height: measureHeight ? Math.round(el.clientHeight) : 0,
		}

		settled.current = next.width > 0 || next.height > 0

		setSize((current) =>
			current.width === next.width && current.height === next.height ? current : next,
		)
	}, [measureWidth, measureHeight])

	// Observe only while a measured axis feeds the sizing — a fully fixed
	// frame constructs no observer, so a resize never re-renders it. The
	// effect no-ops instead of delegating to `useResizeObserver` because the
	// conditionality is this hook's policy, not the shared hook's contract.
	useEffect(() => {
		const el = ref.current

		if (!el || !(measureWidth || measureHeight)) return

		measure()

		let timer: ReturnType<typeof setTimeout> | undefined

		const observer = new ResizeObserver(() => {
			// A reveal measures immediately; a live resize re-arms the settle
			// timer, collapsing the drag's frames into one trailing re-measure.
			if (!settled.current) {
				measure()

				return
			}

			clearTimeout(timer)

			timer = setTimeout(measure, RESIZE_SETTLE_MS)
		})

		observer.observe(el)

		return () => {
			clearTimeout(timer)

			observer.disconnect()
		}
	}, [measure, measureWidth, measureHeight])

	const resolvedWidth = width ?? size.width

	const { height, reserveAspect } = resolveFrameSizing(sizing, resolvedWidth, size.height)

	return { ref, width: resolvedWidth, height, reserveAspect }
}
