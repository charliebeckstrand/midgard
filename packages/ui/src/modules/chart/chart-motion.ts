/**
 * The single source of truth for chart mount animations: every reveal a
 * cartesian or radial chart plays as it first draws — the line drawing itself,
 * the area wash fading in behind it, the point pop, the bars growing from the
 * baseline, the reference rules rising to their value, the pie sweeping round.
 * Both the timing specs and the orientation-aware transform builders live here,
 * so an animated renderer reads a reveal rather than re-deriving one, and the
 * charts and Sparkline animating side by side stay one motion family.
 *
 * The value-axis reveals key on {@link ChartOrientation} exactly as the
 * coordinate transpose in `chart-orientation` does: vertical runs the value axis
 * up y, horizontal along x. Each reveals from the zero baseline in the direction
 * its value points — a bar grows toward its value, a reference rule slides toward
 * its own — so both agree on the axis and the sign. The builders return plain
 * motion targets and carry no `motion/react` import, so this module stays a pure
 * spec the renderers consume and the mapping is unit-testable in isolation.
 */

import type { ChartOrientation } from './chart-orientation'

// Timings mirror the Sparkline's (module-private there), so charts and
// sparklines animating side by side read as one family.

/** Line-draw stroke reveal (`pathLength` 0 → 1). @internal */
export const LINE_DRAW = { duration: 0.7, ease: 'easeInOut' } as const

/** Area wash fade, trailing the line so it fills in as the stroke crosses it. @internal */
export const AREA_FADE = { duration: 0.5, delay: 0.15 } as const

/** Point-marker pop, held until the line has finished drawing. @internal */
export const POINT_POP = { duration: 0.25, delay: LINE_DRAW.duration } as const

/** Per-bar grow from the zero baseline. @internal */
export const BAR_GROW = { duration: 0.4, ease: 'easeOut' } as const

/** Delay step between adjacent bar groups, so they rise in sequence. @internal */
export const BAR_STAGGER = 0.05

/**
 * Reference-rule rise: the rule slides in along the value axis from the baseline
 * to its value, in the direction its value points — the way the matching bar
 * grows — held a beat so it lands as the marks settle.
 * @internal
 */
export const REFERENCE_RISE = { duration: 0.5, ease: 'easeOut', delay: 0.2 } as const

/**
 * The pie's reveal: the disc wipes in clockwise from the top (`pathLength`
 * 0 → 1 on a masking stroke), so the pie draws itself around its angular axis
 * the way the line draws itself along x. @internal
 */
export const SLICE_SWEEP = { duration: 0.8, ease: 'easeInOut' } as const

/** Label fade-in as the sweep passes its slice. @internal */
export const SLICE_FADE = { duration: 0.3, ease: 'easeOut' } as const

/**
 * Whether the value axis runs vertically for this orientation — the one place
 * the mount reveals decide which screen axis to animate, mirroring the
 * coordinate transpose the rest of the frame reads from `chart-orientation`.
 * @internal
 */
function valueVertical(orientation: ChartOrientation): boolean {
	return orientation === 'vertical'
}

/**
 * The mount grow for one bar: it scales in along the value axis from its
 * baseline end — up y for vertical (origin the bottom of a positive bar), out x
 * for horizontal (origin the left of a positive bar).
 *
 * @internal
 */
export function barGrow(orientation: ChartOrientation, positive: boolean) {
	return valueVertical(orientation)
		? { initial: { scaleY: 0 }, animate: { scaleY: 1 }, style: { originY: positive ? 1 : 0 } }
		: { initial: { scaleX: 0 }, animate: { scaleX: 1 }, style: { originX: positive ? 0 : 1 } }
}

/**
 * The mount rise for one reference rule: it slides in along the value axis from
 * the baseline to its value, `offset` the signed gap from the value back to the
 * baseline. Its sign points the reveal the way the value does — up or down for
 * vertical, right or left for horizontal — so a rule animates like the bar that
 * would reach it.
 *
 * @internal
 */
export function referenceRise(orientation: ChartOrientation, offset: number) {
	return valueVertical(orientation)
		? { initial: { y: offset }, animate: { y: 0 } }
		: { initial: { x: offset }, animate: { x: 0 } }
}
