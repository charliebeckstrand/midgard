/**
 * Pure geometry for the {@link PieChart}: value shares swept into slice (or
 * donut ring) paths clockwise from the top, independent of React and styling
 * so the angle math is unit-testable in isolation.
 */

/** One drawable slice: its path, source index, share, and tooltip anchor. @internal */
export type PieSlice = {
	/** The datum's index in the source data — colours and readouts key off it. */
	index: number
	d: string
	/** The slice's part of the whole, `0..1`. */
	share: number
	/** The slice's mid-angle point, where the tooltip and segment label anchor. */
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
	/**
	 * The constant gap between neighbouring slices, in px. Each slice is the
	 * true inward offset of its wedge — its straight edges recede half the gap
	 * and stay parallel to a neighbour's — so the channel holds exactly this
	 * width at every radius and shows the real surface through, no painted
	 * separator to mismatch a tinted card. On a pie the channels cross at the
	 * middle the way knife cuts through a real pie do; a donut's ring never
	 * reaches that crossing. `0` sweeps slices flush.
	 * @defaultValue 0
	 */
	pad?: number
}

/** The point at `angle` degrees (0 at the top, clockwise) on a circle. @internal */
function at(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
	const radians = ((angle - 90) * Math.PI) / 180

	return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

/**
 * The radius at which a slice's label and anchor sit, along its bisector. A
 * donut keeps the mid-ring — the area centroid of a wide ring segment slides
 * into the hole, off the ring. A pie takes the sector's true area centroid,
 * `(2/3)·R·sin α / α` for half-angle `α = share·π`: a sliver tends to `2/3·R`,
 * a half slice pulls inward, a full circle collapses to the center — so every
 * label reads centered in its wedge, not stranded near the rim.
 *
 * @internal
 */
export function pieCentroidRadius(radius: number, innerRadius: number, share: number): number {
	if (innerRadius > 0) return (radius + innerRadius) / 2

	const half = share * Math.PI

	const areaFactor = half > 0 ? Math.sin(half) / half : 1

	return (2 / 3) * radius * areaFactor
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

/**
 * A point on the radial edge at `angle`, `along` out from the center and
 * shifted `perp` sideways along the edge's tangent. Shifting both of a slice's
 * edges inward by half the gap keeps neighbouring edges parallel — a
 * constant-width channel at every radius, never a wedge that pinches shut at
 * the center. @internal
 */
function edgePoint(
	cx: number,
	cy: number,
	angle: number,
	along: number,
	perp: number,
): { x: number; y: number } {
	const radians = ((angle - 90) * Math.PI) / 180

	const cos = Math.cos(radians)

	const sin = Math.sin(radians)

	return { x: cx + along * cos - perp * sin, y: cy + along * sin + perp * cos }
}

/** The SVG large-arc flag for a `sweep`-degree slice once the gap narrows it at radius `r`. @internal */
function spanLarge(sweep: number, half: number, r: number): 0 | 1 {
	const inset = (Math.asin(Math.min(1, half / r)) * 180) / Math.PI

	return sweep - 2 * inset > 180 ? 1 : 0
}

/** A donut slice's inner boundary: back along the end edge, then round its own ring to the start edge. @internal */
function donutBack(
	cx: number,
	cy: number,
	inner: number,
	start: number,
	end: number,
	half: number,
): string {
	const along = Math.sqrt(Math.max(0, inner * inner - half * half))

	const in1 = edgePoint(cx, cy, end, along, -half)

	const in0 = edgePoint(cx, cy, start, along, half)

	return `L ${in1.x} ${in1.y} ${arc(inner, spanLarge(end - start, half, inner), 0, in0)}`
}

/**
 * A pie slice's inner boundary — the exact inward offset of its wedge, the
 * shape constant-width knife cuts leave. The offset edges run straight to
 * their natural intersection: a sharp tip on the bisector, `half / sin(s/2)`
 * from the center. A slice wider than a half-turn has no such tip; its edges
 * are tangent to the tiny `half`-radius circle the cuts leave around the
 * middle, so it rides that circle between the tangent points. Nothing is
 * stepped, capped, or clamped — the cuts simply cross at the center, the way
 * they do through a real pie. @internal
 */
function pieBack(cx: number, cy: number, start: number, end: number, half: number): string {
	if (half <= 0) return `L ${cx} ${cy}`

	const sweep = end - start

	if (sweep <= 180) {
		const tip = at(cx, cy, half / Math.sin((sweep * Math.PI) / 360), start + sweep / 2)

		return `L ${tip.x} ${tip.y}`
	}

	const tangent1 = edgePoint(cx, cy, end, 0, -half)

	const tangent0 = edgePoint(cx, cy, start, 0, half)

	return `L ${tangent1.x} ${tangent1.y} ${arc(half, 0, 0, tangent0)}`
}

/**
 * One slice's path between two angles, its straight edges offset inward by
 * `half` the gap so the channel to each neighbour holds a constant width. A
 * donut rides its inner ring; a pie runs its offset edges to their natural
 * meeting near the center. @internal
 */
function slicePath(
	cx: number,
	cy: number,
	radius: number,
	inner: number,
	start: number,
	end: number,
	half: number,
): string {
	const outerAlong = Math.sqrt(Math.max(0, radius * radius - half * half))

	const outer0 = edgePoint(cx, cy, start, outerAlong, half)

	const outer1 = edgePoint(cx, cy, end, outerAlong, -half)

	const outer = `M ${outer0.x} ${outer0.y} ${arc(radius, spanLarge(end - start, half, radius), 1, outer1)}`

	const back =
		inner > half ? donutBack(cx, cy, inner, start, end, half) : pieBack(cx, cy, start, end, half)

	return `${outer} ${back} Z`
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
	{ cx, cy, radius, innerRadius = 0, pad = 0 }: PieSlicesOptions,
): PieSlice[] {
	const shares = values.map((value) => (value !== null && value > 0 ? value : 0))

	const total = shares.reduce((sum, share) => sum + share, 0)

	if (total <= 0) return []

	const positive = shares.filter((share) => share > 0).length

	// Half the gap is peeled off each edge; a lone full circle has no neighbour
	// to part from.
	const half = positive > 1 ? pad / 2 : 0

	const slices: PieSlice[] = []

	let angle = 0

	shares.forEach((share, index) => {
		if (share === 0) return

		const fraction = share / total

		const sweep = fraction * 360

		const mid = angle + sweep / 2

		// A sliver narrower than the cuts shrinks its own offset: a donut's is
		// bounded by its inner ring, a pie's by keeping the offset edges' tip
		// inside half the radius so the wedge never inverts.
		const pinch =
			innerRadius > 0
				? innerRadius * Math.sin((sweep * 0.35 * Math.PI) / 180)
				: radius * 0.5 * Math.sin((sweep * Math.PI) / 360)

		const h = Math.min(half, pinch)

		slices.push({
			index,
			d:
				positive === 1
					? fullCircle(cx, cy, radius, innerRadius)
					: slicePath(cx, cy, radius, innerRadius, angle, angle + sweep, h),
			share: fraction,
			centroid: at(cx, cy, pieCentroidRadius(radius, innerRadius, fraction), mid),
		})

		angle += sweep
	})

	return slices
}

/**
 * Whether an estimated `chars`-wide label fits inside a slice at its
 * centroid: the clearance to both radial edges must cover half the text, and
 * the ring must be deep enough for a text line. Labels that fail are omitted
 * — never clipped — and the tooltip and data table still carry the value.
 *
 * @internal
 */
export function segmentLabelFits(
	chars: number,
	share: number,
	centroidRadius: number,
	depth: number,
	charWidth: number,
): boolean {
	if (depth < 16) return false

	if (share >= 1) return true

	const half = Math.min(share * 360, 180) / 2

	const clearance = centroidRadius * Math.sin((half * Math.PI) / 180)

	return clearance >= (chars * charWidth) / 2 + 4
}
