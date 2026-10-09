/**
 * Pure geometry for the {@link ScatterChart}:
 *
 * - Row parsing that survives ragged data.
 * - The sorted unique-x columns the hover and readout key on.
 * - Area-true bubble radii.
 * - The point hit test.
 *
 * Independent of React and styling so the mark math is unit-testable in
 * isolation.
 */

import { parseNumeric } from '../../../../utilities'
import type { ChartAxisTick } from '../chart-axes/axis'
import { BUBBLE_MAX_DIAMETER, BUBBLE_MIN_DIAMETER, MARKER_RADIUS } from '../chart-constants'
import { coord } from '../chart-coords'
import { beatsHeldMark } from '../chart-hit-test'
import { READOUT_GAP } from '../chart-series'
import { nearestStopIndex } from '../chart-snap'

/** One parsed point: finite x and y, with the size measure where one was read. @internal */
export type ScatterDatum = {
	x: number
	y: number
	/** The index of the source row in `data`. A row that does not parse takes no point. */
	row: number
	/** The raw size measure; `null` where the series carries none or it fails to parse. */
	size: number | null
}

/** The key fields one series reads, minus the presentation the component owns. @internal */
type ScatterKeys<T> = {
	xKey: keyof T & string
	yKey: keyof T & string
	sizeKey?: keyof T & string
}

/**
 * Reads one series' points off the rows through {@link parseNumeric} on both
 * axes. It drops a point whose x or y does not parse (`null` and blank included),
 * never the scale. Ragged or
 * agent-generated rows therefore degrade to the points that parse. Duplicate
 * positions survive; each row that parses is a point.
 *
 * @internal
 */
export function scatterData<T>(data: T[], keys: ScatterKeys<T>): ScatterDatum[] {
	const points: ScatterDatum[] = []

	for (let row = 0; row < data.length; row++) {
		const datum = data[row] as T

		const x = parseNumeric(datum[keys.xKey])

		const y = parseNumeric(datum[keys.yKey])

		if (x === null || y === null) continue

		const size = keys.sizeKey === undefined ? null : parseNumeric(datum[keys.sizeKey])

		points.push({ x, y, row, size })
	}

	return points
}

/**
 * The ascending unique x values across every visible series. They are the
 * columns the hover index, crosshair snap, keyboard cursor, and readout all key
 * on. That is the scatter counterpart of the band charts' categories.
 *
 * @internal
 */
export function uniqueXValues(seriesData: ScatterDatum[][]): number[] {
	let count = 0

	for (const points of seriesData) count += points.length

	// A typed array sorts numbers natively, with no comparator call per pair.
	const xs = new Float64Array(count)

	let at = 0

	for (const points of seriesData) for (const point of points) xs[at++] = point.x

	xs.sort()

	const unique: number[] = []

	for (const x of xs) {
		// Adds zero so -0 and 0 share one column, as a `Set` keys them.
		if (unique.length === 0 || x !== unique[unique.length - 1]) unique.push(x + 0)
	}

	return unique
}

/**
 * One series' size extent, for the bubble radius scaling; `null` when no point
 * carries a finite size that is not negative (a plain scatter series). A
 * negative size draws no disc, so it takes no part in the extent.
 *
 * @internal
 */
export function sizeDomain(points: ScatterDatum[]): [number, number] | null {
	// One fold, as `linearScale` reads its extent: a spread into `Math.min` copies
	// the sizes and throws past the argument limit of the engine.
	let low = Number.POSITIVE_INFINITY

	let high = Number.NEGATIVE_INFINITY

	for (const { size } of points) {
		if (size === null || size < 0) continue

		if (size < low) low = size

		if (size > high) high = size
	}

	return low <= high ? [low, high] : null
}

/** The diameter range a series scales its bubbles into, from its spec or the defaults. @internal */
export function diameterRange(size?: number, maxSize?: number): [number, number] {
	const low = Math.max(1, size ?? BUBBLE_MIN_DIAMETER)

	return [low, Math.max(low, maxSize ?? BUBBLE_MAX_DIAMETER)]
}

/**
 * A point's radius. Bubbles interpolate on the square root of the size, between
 * the diameter range's ends over the series' own size extent. Area, not
 * diameter, carries the quantity. A sizeless series takes the plain marker
 * radius. In a sized series:
 *
 * - A size that is not finite (`null`), or a size of zero, takes the smallest
 *   diameter.
 * - A negative size takes `0`, for no disc.
 * - A degenerate extent reads mid-range, because equal sizes must read equal,
 *   not minimal.
 *
 * @internal
 */
export function sizeRadius(
	size: number | null,
	domain: [number, number] | null,
	diameters: [number, number],
): number {
	if (domain === null) return MARKER_RADIUS

	const [minD, maxD] = diameters

	if (size === null || size === 0) return minD / 2

	if (size < 0) return 0

	const [low, high] = [Math.sqrt(Math.max(0, domain[0])), Math.sqrt(Math.max(0, domain[1]))]

	// Half the mid diameter: equal sizes read equal, not minimal.
	if (high === low) return (minD + maxD) / 4

	const t = (Math.sqrt(Math.max(0, size)) - low) / (high - low)

	return (minD + t * (maxD - minD)) / 2
}

/** Whether a point draws a disc: every point does, except one with a negative size. @internal */
function drawsDisc(point: ScatterDatum): boolean {
	return point.size === null || point.size >= 0
}

/**
 * The points of one series that draw a disc. A point with a negative size draws
 * none, so it leaves the marks, the hit test, and the keyboard stops. The scales
 * and the readout still read it from the whole list. Returns `points` itself
 * when each point draws, so a plain series copies nothing.
 *
 * @internal
 */
export function scatterDrawn(points: ScatterDatum[]): ScatterDatum[] {
	return points.every(drawsDisc) ? points : points.filter(drawsDisc)
}

/** One drawable point: its frame position and radius. @internal */
export type ScatterMark = {
	x: number
	y: number
	r: number
}

/**
 * Projects one series' points onto drawable marks through the two scales, each
 * radius resolved from the series' size extent.
 *
 * @internal
 */
export function scatterMarks(
	points: ScatterDatum[],
	mapX: (value: number) => number,
	mapY: (value: number) => number,
	radius: (size: number | null) => number,
): ScatterMark[] {
	return points.map((point) => ({
		x: mapX(point.x),
		y: mapY(point.y),
		r: radius(point.size),
	}))
}

/**
 * Every disc of a series concatenated into one path `d`. Each disc is a closed
 * subfigure, two half-arcs around its center. The fill therefore fills every
 * disc and the stroke rings each one, exactly as separate circles did. Marks
 * with a non-positive radius are skipped — a degenerate arc would paint nothing
 * and only lengthen the string.
 *
 * A plain series shares one radius across every disc. The two arc commands read
 * only the radius, not the center, so they are identical for all of them. The
 * builder caches that suffix and rebuilds it only when a radius actually
 * changes. One move-to per disc is left as the sole per-mark formatting. At ten
 * thousand points that is the difference between fifty
 * thousand coordinate roundings and twenty thousand.
 *
 * @internal
 */
export function scatterDiscsPath(marks: ScatterMark[]): string {
	// Accumulate into one buffer rather than a per-disc parts array joined at the
	// end: the array is an N-string allocation the concatenation avoids, and the
	// disc path is the scatter mount's largest string term at ten thousand
	// points. Byte-identical to the prior `parts.join(' ')`.
	let d = ''

	let cachedR = Number.NaN

	let arc = ''

	for (const mark of marks) {
		if (mark.r <= 0) continue

		if (mark.r !== cachedR) {
			cachedR = mark.r

			const r = coord(mark.r)

			arc = `a ${r} ${r} 0 1 0 ${coord(mark.r * 2)} 0 a ${r} ${r} 0 1 0 ${coord(-mark.r * 2)} 0 Z`
		}

		if (d !== '') d += ' '

		d += `M ${coord(mark.x - mark.r)} ${coord(mark.y)} ${arc}`
	}

	return d
}

/** One snapped column stop: its value-axis screen position and the point behind it. @internal */
export type ScatterSnapStop = { y: number; series: number; datum: number }

/**
 * One series' points grouped by x in one pass, each mapped through `entry`. A
 * per-column read therefore costs a map lookup, rather than a rescan of every
 * point. That is O(points) over the grid instead of O(uniqueXs × points), which
 * turns quadratic on the all-distinct x the docs advertise. Insertion order
 * matches a per-column filter, so a group keeps point order.
 *
 * @internal
 */
function groupByX<T>(
	points: ScatterDatum[],
	entry: (point: ScatterDatum, datum: number) => T,
): Map<number, T[]> {
	const groups = new Map<number, T[]>()

	points.forEach((point, datum) => {
		const group = groups.get(point.x)

		if (group) group.push(entry(point, datum))
		else groups.set(point.x, [entry(point, datum)])
	})

	return groups
}

/**
 * Per unique x, every visible point at that x — duplicates included — with its
 * screen y and identity, in series-major point order. The snap targets behind
 * {@link scatterSnapColumns}, kept whole here so the mark isolation can name
 * the disc behind the stop the tooltip anchors.
 *
 * @internal
 */
export function scatterSnapStops(
	seriesData: ScatterDatum[][],
	uniqueXs: number[],
	mapY: (value: number) => number,
): ScatterSnapStop[][] {
	const byX = seriesData.map((points, series) =>
		groupByX(points, (point, datum): ScatterSnapStop => ({ y: mapY(point.y), series, datum })),
	)

	return uniqueXs.map((x) => byX.flatMap((groups) => groups.get(x) ?? []))
}

/**
 * Per unique x, the visible series' y screen positions: every point at that x,
 * duplicates included. They are the crosshair's and keyboard cursor's snap
 * targets, shaped exactly like the band charts' snap points. The positions half
 * of {@link scatterSnapStops}, index-aligned with it.
 *
 * @internal
 */
export function scatterSnapColumns(stops: ScatterSnapStop[][]): number[][] {
	return stops.map((column) => column.map((stop) => stop.y))
}

/**
 * Per unique x, the series behind each stop, index-aligned with
 * {@link scatterSnapColumns}. `indices` maps each place in the visible list to
 * the series' own index. The keyboard cursor reads it to emphasize the series of
 * the point it sits on.
 *
 * @internal
 */
export function scatterSnapSeries(stops: ScatterSnapStop[][], indices: number[]): number[][] {
	return stops.map((column) => column.map((stop) => indices[stop.series] ?? stop.series))
}

/**
 * The stop nearest `y` in column `index`, or `null` off every stop (an empty
 * column, or no column). The same resolution the snapped tooltip anchors with,
 * so the isolated disc and the readout can never disagree. Moving along the
 * column hands both to the next point, at the midpoint between stops.
 *
 * @internal
 */
export function scatterSnappedStop(
	stops: ScatterSnapStop[][],
	index: number | null,
	y: number,
): ScatterSnapStop | null {
	const column = index === null ? [] : (stops[index] ?? [])

	const stop = nearestStopIndex(
		column.map((entry) => entry.y),
		y,
	)

	return stop === null ? null : (column[stop] ?? null)
}

/**
 * One series' readout cells, per unique x: each point's formatted y, with its
 * size measure in parentheses where one was read. Duplicates at an x are
 * joined, and an em-dash stands where the series has no point there.
 *
 * @internal
 */
export function scatterReadoutValues(
	points: ScatterDatum[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatSize: ((value: number) => string) | null,
): string[] {
	const byX = groupByX(points, (point) => point)

	return uniqueXs.map((x) => {
		const cells = (byX.get(x) ?? []).map((point) =>
			formatSize && point.size !== null
				? `${format(point.y)} (${formatSize(point.size)})`
				: format(point.y),
		)

		return cells.length > 0 ? cells.join(', ') : READOUT_GAP
	})
}

/**
 * Arbitrates the held disc against the nearest caught one. The held keeps the
 * win while it stayed caught (a finite distance), and no challenger
 * {@link beatsHeldMark | decisively} closes.
 *
 * @internal
 */
function resolveHeldDisc(
	best: { series: number; datum: number } | null,
	bestSquared: number,
	held: { series: number; datum: number } | null,
	heldSquared: number,
): { series: number; datum: number } | null {
	if (best === null || held === null || !Number.isFinite(heldSquared)) return best

	if (best.series === held.series && best.datum === held.datum) return best

	if (beatsHeldMark(bestSquared, heldSquared)) return best

	return held
}

/**
 * The disc the pointer sits on — its series and datum indices — or `null` off
 * every disc, each disc caught within `slack` of its edge. The nearest disc
 * center wins where discs overlap, so the isolation lifts the one the pointer
 * is truly on rather than whichever drew first. A `held` disc — the one
 * already emphasized — keeps the win while it stays caught, unless a
 * challenger decisively closes ({@link beatsHeldMark}). The resolution is
 * sticky across the midline between discs, rather than flipping on it.
 *
 * This scan runs per pointer move over every visible point, so it stays in
 * squared distances end to end. Nearest-by-distance and nearest-by-squared
 * pick the same disc, and {@link beatsHeldMark} already compares squares.
 *
 * @internal
 */
export function scatterMarkAt(
	marks: ScatterMark[][],
	x: number,
	y: number,
	slack: number,
	held: { series: number; datum: number } | null = null,
): { series: number; datum: number } | null {
	let best: { series: number; datum: number } | null = null

	let bestSquared = Number.POSITIVE_INFINITY

	let heldSquared = Number.POSITIVE_INFINITY

	for (let series = 0; series < marks.length; series++) {
		const points = marks[series] as ScatterMark[]

		for (let datum = 0; datum < points.length; datum++) {
			const squared = discCatchSquared(points[datum] as ScatterMark, x, y, slack)

			if (squared < 0) continue

			if (held !== null && series === held.series && datum === held.datum) {
				heldSquared = squared
			}

			// A tie goes to the later disc, which paints over the earlier one.
			if (squared <= bestSquared) {
				bestSquared = squared

				best = { series, datum }
			}
		}
	}

	return resolveHeldDisc(best, bestSquared, held, heldSquared)
}

/**
 * The squared pointer distance to a caught disc, or `-1` off it. Rejects on
 * each axis before multiplying, so the far discs (nearly all of them, every
 * move) cost two compares and no arithmetic. `Math.hypot` has no place here:
 * it buys overflow safety these viewport-sized coordinates never need, at
 * several times the cost of the products.
 *
 * @internal
 */
function discCatchSquared(point: ScatterMark, x: number, y: number, slack: number): number {
	const reach = point.r + slack

	const dx = point.x - x

	if (dx > reach || dx < -reach) return -1

	const dy = point.y - y

	if (dy > reach || dy < -reach) return -1

	const squared = dx * dx + dy * dy

	return squared > reach * reach ? -1 : squared
}

/** How far a tick's mapped position can sit from a range end and still count as sitting on it. @internal */
const EDGE_EPSILON = 0.5

/**
 * Anchors a value axis's end tick labels inward. `'start'` goes on the tick
 * sitting at the range start, and `'end'` on the one at its end. The interior
 * ticks are left centered under their positions. The scatter x axis's floor tick
 * abuts the value gutter, and its ceiling tick nears the frame's right edge.
 * Centered there, they crowd the y-axis floor label at one corner and butt the
 * frame at the other. Reading the ends inward clears both without a width
 * estimate. That is the treatment {@link endBandTicks} gives the compact band
 * axis, and which the x axis already honors through {@link ChartAxisTick.anchor}.
 * A tick sitting interior to the range keeps the centered default, since only an
 * edge label crowds. That is a pinned domain whose edge carries no tick of its
 * own.
 *
 * @internal
 */
export function anchorEndTicks(ticks: ChartAxisTick[], from: number, to: number): ChartAxisTick[] {
	return ticks.map((tick): ChartAxisTick => {
		if (Math.abs(tick.at - from) <= EDGE_EPSILON) return { ...tick, anchor: 'start' }

		if (Math.abs(tick.at - to) <= EDGE_EPSILON) return { ...tick, anchor: 'end' }

		return tick
	})
}
