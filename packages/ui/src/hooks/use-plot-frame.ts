'use client'

import {
	type RefCallback,
	type RefObject,
	startTransition,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react'

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
	| {
			/**
			 * The ratio governs the whole figure — plot and legend together — through a
			 * CSS `aspect-ratio` the figure wrapper carries, and the plot measures the
			 * height that leaves so the drawing fills it. It falls back to the full
			 * `width / ratio` until that measurement lands, so a server render, an
			 * explicit `width`, or a test frame still resolves a deterministic height
			 * from the width alone — the browser then refines it to the legend-adjusted
			 * remainder. The whole-chart ratio a legend shares, the width-driven twin of
			 * `fill`'s container-height measurement.
			 */
			mode: 'aspect-fill'
			ratio: number
	  }
	| { mode: 'fill' }
	| {
			mode: 'content'
			hMargin: number
			vMargin: number
			/**
			 * Tight radius override once the real `width` is known, replacing the
			 * flat `width / 2 - hMargin` subtraction — a pie's asymmetric callout
			 * fit, whose margin isn't the same constant on both sides. `hMargin`
			 * still sizes the CSS pre-measurement reserve, an approximation this
			 * only refines after the first real measurement.
			 */
			radius?: (width: number) => number
	  }

/**
 * How a width-derived frame reserves its drawing height from its own width
 * through CSS — the reservation that holds the box steady before the width is
 * measured and across every animation replay. `aspect` reserves a
 * `width / height` ratio (CSS `aspect-ratio`); `content` reserves the affine
 * `max(min, width + offset)` a bare ratio can't express — `offset` shifts an
 * `aspect-ratio` of 1, and `min` floors the height where the width-bound radius
 * would otherwise go negative, so a narrow box holds that floor instead of
 * collapsing to nothing. A `fixed` or `fill` frame reserves nothing — its
 * height is a pixel value the box takes directly.
 *
 * @internal
 */
export type FrameReserve =
	| { mode: 'aspect'; ratio: number }
	| { mode: 'content'; offset: number; min: number }

/** A resolved frame box: the drawing height, and how the box reserves it. @internal */
export type ResolvedFrameSizing = {
	/** The frame's drawing height in px; `0` until the width is measured. */
	height: number
	/**
	 * How the plot box reserves its height from its own width through CSS, or
	 * `null` when the height is a fixed pixel value or fills the container.
	 */
	reserve: FrameReserve | null
}

/**
 * Applies a {@link FrameSizing} policy: the drawing height, and how the plot
 * box holds it. `aspect` derives the height from the measured `width` and
 * reserves that same ratio through CSS — taking the height from the box's own
 * width keeps it steady before the width is measured and across every
 * animation replay, where a pixel height off the yet-unmeasured width would
 * collapse to zero and jump. `content` derives from the width too, but its
 * `width → height` is affine (a pair of margins), not a pure ratio; it reserves
 * an `aspect-ratio` of 1 shifted by a constant pixel `offset`, so its box holds
 * as steady as `aspect` rather than collapsing to a pixel `0`. `fill` takes the
 * container's measured height and `fixed` is its own pixel value — neither
 * reserves anything.
 *
 * @internal
 */
export function resolveFrameSizing(
	sizing: FrameSizing,
	width: number,
	containerHeight: number,
): ResolvedFrameSizing {
	if (sizing.mode === 'fixed') return { height: sizing.height, reserve: null }

	if (sizing.mode === 'fill') return { height: containerHeight, reserve: null }

	if (sizing.mode === 'aspect-fill') {
		// The figure's CSS aspect-ratio drives the whole-chart height; the plot
		// measures the remainder the legend leaves. Before that measurement lands
		// (a server render, an explicit width, a test frame) fall back to the full
		// `width / ratio`, so the frame draws from the width alone rather than
		// collapsing — the browser refines to the measured remainder once it does.
		const remainder = containerHeight > 0 ? containerHeight : Math.round(width / sizing.ratio)

		return { height: width > 0 ? remainder : 0, reserve: null }
	}

	if (sizing.mode === 'content') {
		// The CSS reserve always sizes off the flat hMargin — an approximation of
		// the true radius, refined below once a real width lands — since a
		// per-slice margin isn't expressible as the single `width + offset` a CSS
		// padding box can hold before that measurement.
		const reserve: FrameReserve = {
			mode: 'content',
			offset: 2 * (sizing.vMargin - sizing.hMargin),
			min: 2 * sizing.vMargin,
		}

		if (width <= 0) return { height: 0, reserve }

		// height = 2·radius + 2·vMargin and radius = max(0, width/2 − hMargin) by
		// default, so the box is aspect-ratio 1 shifted by `offset` and floored at
		// `min` — max(min, width + offset) — reserved from the width the same way
		// an aspect ratio is, so it holds before the width is measured and never
		// collapses. `radius` refines that once the real width is known.
		const radius = Math.max(0, sizing.radius ? sizing.radius(width) : width / 2 - sizing.hMargin)

		return { height: Math.round(2 * radius + 2 * sizing.vMargin), reserve }
	}

	return {
		height: width > 0 ? Math.round(width / sizing.ratio) : 0,
		reserve: { mode: 'aspect', ratio: sizing.ratio },
	}
}

/**
 * The measuring handle {@link usePlotFrame} returns: a callback ref, so
 * attachment itself re-targets the hook's ResizeObserver whenever React swaps
 * the plot node, intersected with the object-ref view whose `.current` readers
 * of the live node — tooltip hit-testing, hover geometry — keep dereferencing.
 *
 * @internal
 */
export type PlotFrameRef = RefCallback<HTMLDivElement> & RefObject<HTMLDivElement | null>

/**
 * Resolves a plot frame's drawing size from its {@link FrameSizing} policy,
 * measuring only the dimensions the policy consumes so a resize re-renders
 * the frame only when it must. An explicit `width` is returned as-is with no
 * measurement — the deterministic path for fixed frames, SSR output, and
 * tests — otherwise the container's width is measured and the frame fills
 * it. A height is measured only where the policy reads one: the container's
 * under `fill`, the plot's own remainder under `aspect-fill`; `fixed`,
 * `aspect`, and `content` heights ignore it, so tracking it would re-render
 * the frame on every resize for a value the policy discards. A frame whose
 * size is fully fixed by props observes nothing at all, so a resize never
 * reaches it.
 *
 * Resize notifications commit as transitions: the frame tracks its container
 * live — no settle window, no timers — while React coalesces a burst by
 * abandoning renders whose size is already stale, so a window drag on a slow
 * frame refits at the pace the machine can afford and always lands on the
 * final size. The mount measurement instead settles in a layout effect that
 * re-runs on each size change, so a size that resolves a tier which mounts or
 * drops the header and legend — reflowing the plot the drawing height reads —
 * reaches its fixed point before the first paint rather than flashing a size it
 * is about to abandon.
 *
 * @param width - An explicit drawing width, or `undefined` to fill and
 * measure the container.
 * @param sizing - The frame's sizing policy, from `chartFrameSizing` or
 * `mapFrameSizing`.
 * @returns The wrapper `ref` to attach — a callback ref that re-targets the
 * observer if React swaps the node, still readable through `.current` — and
 * the resolved drawing box; an unmeasured `width` stays `0`, which renders the
 * frame shell without marks for that first paint (server and client agree, so
 * no hydration mismatch).
 * @internal
 */
export function usePlotFrame(
	width: number | undefined,
	sizing: FrameSizing,
): {
	ref: PlotFrameRef
	width: number
	height: number
	reserve: FrameReserve | null
} {
	// The observed node is state, not a bare ref: measurement and observation
	// must follow the node React attaches, and a layout re-arrangement can
	// recreate the plot element positionally without ever unmounting this hook.
	// An object ref read by policy-keyed effects would keep the observer on the
	// detached node through such a swap — the frame frozen at its last committed
	// size while its CSS box resizes on.
	const [node, setNode] = useState<HTMLDivElement | null>(null)

	// The attachment handle: a stable callback ref, so React reports every
	// attach and detach into `node`, carrying the object-ref `.current` view
	// consumers read outside the render cycle (tooltip hit-testing, hover
	// geometry).
	const ref = useMemo<PlotFrameRef>(() => {
		const handle = Object.assign(
			(next: HTMLDivElement | null) => {
				handle.current = next

				setNode(next)
			},
			{ current: null as HTMLDivElement | null },
		)

		return handle
	}, [])

	// The policy decides what the frame consumes: the width feeds every
	// sizing but `fixed` unless the consumer fixes it directly, and a height
	// feeds only the height-measured cases — `fill` and `aspect-fill`.
	const measureWidth = width === undefined

	// `fill` reads the container's height; `aspect-fill` reads the plot's own — the
	// remainder its figure's aspect-ratio leaves once the legend takes its size.
	const measureHeight = sizing.mode === 'fill' || sizing.mode === 'aspect-fill'

	const [size, setSize] = useState({ width: 0, height: 0 })

	const measure = useCallback(
		(el: HTMLDivElement) => {
			// Integer px, equality-guarded, so observer notifications can't churn
			// state. An axis the policy ignores stays 0 and never re-renders it.
			const next = {
				width: measureWidth ? Math.round(el.clientWidth) : 0,
				height: measureHeight ? Math.round(el.clientHeight) : 0,
			}

			setSize((current) =>
				current.width === next.width && current.height === next.height ? current : next,
			)
		},
		[measureWidth, measureHeight],
	)

	// Settle the size before the browser paints, and re-settle on every size
	// change: the mount measure can resolve a tier that mounts or drops the
	// header and legend, reflowing the plot the drawing height is read from — so
	// a single measure would paint the first size, then jump when the reflow
	// re-measures. Re-running on `size` drives that measure → reflow → re-measure
	// chain to a fixed point before the first paint, so the frame never flashes a
	// size it is about to abandon. The tier resolves from a chrome-independent
	// height (see `chartPolicy` callers), so the chain converges rather than
	// oscillating, and the equality-guarded `setSize` stops it once it lands.
	// A layout effect, not passive, so the settle precedes paint the way the
	// legend's own fit measure does — and `node` lands here as state pre-paint
	// too, so a mount or swap measures before the browser shows it. `size` is a
	// re-trigger, not read: each run measures the DOM afresh, so re-running on
	// the last committed size walks the chain to its fixed point.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `size` re-triggers the re-measure; the effect reads the live DOM, not the value.
	useLayoutEffect(() => {
		if (!node || !(measureWidth || measureHeight)) return

		measure(node)
	}, [node, measure, measureWidth, measureHeight, size])

	// Observe only while a measured axis feeds the sizing — a fully fixed
	// frame constructs no observer, so a resize never re-renders it. Keyed on
	// `node`, so a swapped plot element re-targets the observer: the detached
	// node is let go and the live one watched. The effect no-ops instead of
	// delegating to `useResizeObserver` because the conditionality is this
	// hook's policy, not the shared hook's contract.
	useEffect(() => {
		if (!node || !(measureWidth || measureHeight)) return

		const observer = new ResizeObserver(() => {
			// Transition priority: a burst of notifications coalesces — React
			// abandons a render for a size a newer notification has already
			// outdated — and the geometry rebuild never blocks urgent work.
			startTransition(() => measure(node))
		})

		observer.observe(node)

		return () => {
			observer.disconnect()
		}
	}, [node, measure, measureWidth, measureHeight])

	const resolvedWidth = width ?? size.width

	const { height, reserve } = resolveFrameSizing(sizing, resolvedWidth, size.height)

	return { ref, width: resolvedWidth, height, reserve }
}
