/**
 * Pure geometry for the {@link PieChart}: value shares swept into slice (or
 * donut ring) paths clockwise from the top, independent of React and styling
 * so the angle math is unit-testable in isolation.
 */

/** One drawable slice: its path, source index, and tooltip anchor. @internal */
export type PieSlice = {
	/** The datum's index in the source data — colours and readouts key off it. */
	index: number
	d: string
	/** The slice's mid-angle point, where the tooltip anchors. */
	centroid: { x: number; y: number }
}

/** Options for {@link pieSlices}. @internal */
export type PieSlicesOptions = {
	/** Center x, in `viewBox` units. */
	cx: number
	/** Center y. */
	cy: number
	/** Outer radius. */
	radius: number
	/**
	 * Inner radius for the donut variant; `0` sweeps full slices.
	 * @defaultValue 0
	 */
	innerRadius?: number
}

/** The point at `angle` degrees (0 at the top, clockwise) on a circle. @internal */
function at(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
	const radians = ((angle - 90) * Math.PI) / 180

	return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

/** `A` command to `end` on `radius`, sweeping clockwise when `sweep` is 1. @internal */
function arc(radius: number, large: 0 | 1, sweep: 0 | 1, end: { x: number; y: number }): string {
	return `A ${radius} ${radius} 0 ${large} ${sweep} ${end.x} ${end.y}`
}

/** The full ring (or disc) a single non-zero value degenerates to. @internal */
function fullCircle(cx: number, cy: number, radius: number, inner: number): string {
	const top = at(cx, cy, radius, 0)

	const bottom = at(cx, cy, radius, 180)

	// One 360° arc collapses to nothing; two half arcs draw the circle.
	const outer = `M ${top.x} ${top.y} ${arc(radius, 1, 1, bottom)} ${arc(radius, 1, 1, top)}`

	if (inner <= 0) return `${outer} Z`

	const innerTop = at(cx, cy, inner, 0)

	const innerBottom = at(cx, cy, inner, 180)

	// The counter-swept inner circle punches the hole under the nonzero fill rule.
	return `${outer} M ${innerTop.x} ${innerTop.y} ${arc(inner, 1, 0, innerBottom)} ${arc(inner, 1, 0, innerTop)} Z`
}

/** One slice's path between two angles. @internal */
function slicePath(
	cx: number,
	cy: number,
	radius: number,
	inner: number,
	start: number,
	end: number,
): string {
	const large: 0 | 1 = end - start > 180 ? 1 : 0

	const from = at(cx, cy, radius, start)

	const to = at(cx, cy, radius, end)

	if (inner <= 0) return `M ${cx} ${cy} L ${from.x} ${from.y} ${arc(radius, large, 1, to)} Z`

	const innerTo = at(cx, cy, inner, end)

	const innerFrom = at(cx, cy, inner, start)

	return `M ${from.x} ${from.y} ${arc(radius, large, 1, to)} L ${innerTo.x} ${innerTo.y} ${arc(inner, large, 0, innerFrom)} Z`
}

/**
 * Sweeps the positive values into slices, clockwise from the top, each
 * share's angle proportional to its part of the whole.
 *
 * @remarks Non-finite and non-positive values take no slice — a pie encodes
 * parts of a whole, and a negative part has no arc; they stay in the chart's
 * readout instead. A single positive value draws the full circle (two half
 * arcs — one 360° arc command collapses to nothing).
 * @internal
 */
export function pieSlices(
	values: (number | null)[],
	{ cx, cy, radius, innerRadius = 0 }: PieSlicesOptions,
): PieSlice[] {
	const shares = values.map((value) => (value !== null && value > 0 ? value : 0))

	const total = shares.reduce((sum, share) => sum + share, 0)

	if (total <= 0) return []

	const positive = shares.filter((share) => share > 0).length

	const centroidRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.62

	const slices: PieSlice[] = []

	let angle = 0

	shares.forEach((share, index) => {
		if (share === 0) return

		const sweep = (share / total) * 360

		const mid = angle + sweep / 2

		slices.push({
			index,
			d:
				positive === 1
					? fullCircle(cx, cy, radius, innerRadius)
					: slicePath(cx, cy, radius, innerRadius, angle, angle + sweep),
			centroid: at(cx, cy, centroidRadius, mid),
		})

		angle += sweep
	})

	return slices
}
