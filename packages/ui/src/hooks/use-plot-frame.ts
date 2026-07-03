'use client'

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

/**
 * Frame sizing and measurement for the plot-bearing modules (chart, map): a
 * {@link FrameSizing} policy — resolved by each module from its own props
 * through `chartFrameSizing` or `mapFrameSizing` — drives {@link usePlotFrame},
 * which measures only the axes the policy consumes and resolves it to a
 * concrete box through {@link resolveFrameSizing}.
 */

/**
 * How a frame's drawing height comes to be — the single value that drives
 * measurement, observation, and height resolution, so no two places can
 * disagree about what the frame needs. `fixed` is an explicit pixel height,
 * `aspect` derives the height from the drawing width by a constant ratio,
 * `fill` takes the container's measured height (the free-form case — the
 * only one where the container height is worth measuring at all), and
 * `content` derives the height from the width and a pair of margins — for
 * content whose natural shape isn't a fixed ratio, like a circle boxed by an
 * asymmetric horizontal and vertical margin.
 *
 * @internal
 */
export type FrameSizing =
	| { mode: 'fixed'; height: number }
	| { mode: 'aspect'; ratio: number }
	| { mode: 'fill' }
	| { mode: 'content'; hMargin: number; vMargin: number }

/** A resolved frame box: the drawing height, and the ratio to reserve it in CSS. @internal */
export type ResolvedFrameSizing = {
	/** The frame's drawing height in px; `0` until the width is measured. */
	height: number
	/**
	 * The `width / height` ratio the plot box reserves through CSS
	 * `aspect-ratio`, or `null` when the height is a fixed pixel value or
	 * fills the container.
	 */
	reserveAspect: number | null
}

/**
 * Applies a {@link FrameSizing} policy: the drawing height, and how the plot
 * box holds it. An `aspect` policy derives the height from the measured
 * `width` and reserves that same ratio through CSS — taking the height from
 * the box's own width keeps it steady before the width is measured and across
 * every animation replay, where a pixel height off the yet-unmeasured width
 * would collapse to zero and jump. `fill` takes the container's measured
 * height; `fixed` is its own pixel value with nothing to reserve. `content`
 * also derives from the measured `width`, but its width/height relationship
 * isn't a fixed ratio, so there's nothing for CSS `aspect-ratio` to reserve —
 * like `fill`, its box is a pixel `0` until the width is measured.
 *
 * @internal
 */
export function resolveFrameSizing(
	sizing: FrameSizing,
	width: number,
	containerHeight: number,
): ResolvedFrameSizing {
	if (sizing.mode === 'fixed') return { height: sizing.height, reserveAspect: null }

	if (sizing.mode === 'fill') return { height: containerHeight, reserveAspect: null }

	if (sizing.mode === 'content') {
		if (width <= 0) return { height: 0, reserveAspect: null }

		const radius = Math.max(0, width / 2 - sizing.hMargin)

		return { height: Math.round(2 * radius + 2 * sizing.vMargin), reserveAspect: null }
	}

	return {
		height: width > 0 ? Math.round(width / sizing.ratio) : 0,
		reserveAspect: sizing.ratio,
	}
}

/**
 * Resolves a plot frame's drawing size from its {@link FrameSizing} policy,
 * measuring only the dimensions the policy consumes so a resize re-renders
 * the frame only when it must. An explicit `width` is returned as-is with no
 * measurement — the deterministic path for fixed frames, SSR output, and
 * tests — otherwise the container's width is measured and the frame fills
 * it. The container's height is measured only under a `fill` policy; `fixed`,
 * `aspect`, and `content` heights ignore it, so tracking it would re-render
 * the frame on every resize for a value the policy discards. A frame whose
 * size is fully fixed by props observes nothing at all, so a resize never
 * reaches it.
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

	// The policy decides what the frame consumes: the width feeds every
	// sizing but `fixed` unless the consumer fixes it directly, and the
	// container height feeds only the free-form `fill` case.
	const measureWidth = width === undefined

	const measureHeight = sizing.mode === 'fill'

	const [size, setSize] = useState({ width: 0, height: 0 })

	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		// Integer px, equality-guarded, so observer notifications can't churn
		// state. An axis the policy ignores stays 0 and never re-renders it.
		const next = {
			width: measureWidth ? Math.round(el.clientWidth) : 0,
			height: measureHeight ? Math.round(el.clientHeight) : 0,
		}

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

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [measure, measureWidth, measureHeight])

	const resolvedWidth = width ?? size.width

	const { height, reserveAspect } = resolveFrameSizing(sizing, resolvedWidth, size.height)

	return { ref, width: resolvedWidth, height, reserveAspect }
}
