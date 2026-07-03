/**
 * Frame sizing for the plot-bearing modules (chart, map): the policy that
 * decides how a frame's drawing height comes to be, and its resolution to a
 * concrete box. Kept React-free beside `use-plot-frame.ts` so the math is
 * unit-testable in isolation. Each module resolves its own props to a
 * {@link FrameSizing} (`chartFrameSizing`, `mapFrameSizing`); everything
 * downstream is shared.
 */

/**
 * Quiet window after the last resize frame before the frame re-measures (and
 * an animated chart replays its reveal) — the system's one settle beat.
 *
 * @internal
 */
export const RESIZE_SETTLE_MS = 200

/**
 * How a frame's drawing height comes to be — the single value that drives
 * measurement, observation, and height resolution, so no two places can
 * disagree about what the frame needs. `fixed` is an explicit pixel height,
 * `aspect` derives the height from the drawing width, and `fill` takes the
 * container's measured height (the free-form case — the only one where the
 * container height is worth measuring at all).
 *
 * @internal
 */
export type FrameSizing =
	| { mode: 'fixed'; height: number }
	| { mode: 'aspect'; ratio: number }
	| { mode: 'fill' }

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
 * height; `fixed` is its own pixel value with nothing to reserve.
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

	return {
		height: width > 0 ? Math.round(width / sizing.ratio) : 0,
		reserveAspect: sizing.ratio,
	}
}
