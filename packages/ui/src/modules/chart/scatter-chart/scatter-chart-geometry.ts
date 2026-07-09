/**
 * Pure geometry for the {@link ScatterChart}: row parsing that survives ragged
 * data, the sorted unique-x columns the hover and readout key on, area-true
 * bubble radii, and the point hit test. Independent of React and styling so the
 * mark math is unit-testable in isolation.
 */

import type { ChartAxisTick } from '../chart-axis'
import {
	BUBBLE_MAX_DIAMETER,
	BUBBLE_MIN_DIAMETER,
	GUTTER_EDGE_PAD,
	MARKER_RADIUS,
	TICK_CHAR_WIDTH,
} from '../chart-constants'
import { beatsHeldMark } from '../chart-hit-test'
import { linearScale } from '../chart-scale'
import { READOUT_GAP } from '../chart-series'
import { nearestStopIndex } from '../chart-snap'

/** One parsed point: finite x and y, with the size measure where one was read. @internal */
export type ScatterDatum = {
	x: number
	y: number
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
 * Reads one series' points off the rows: `Number(datum[key])` on both axes,
 * dropping a point whose x or y is non-finite — never the scale — so ragged or
 * agent-generated rows degrade to the points that parse. Duplicate positions
 * survive; each row that parses is a point.
 *
 * @internal
 */
export function scatterData<T>(data: T[], keys: ScatterKeys<T>): ScatterDatum[] {
	return data.flatMap((datum) => {
		const x = Number(datum[keys.xKey])

		const y = Number(datum[keys.yKey])

		if (!Number.isFinite(x) || !Number.isFinite(y)) return []

		const size = keys.sizeKey === undefined ? null : Number(datum[keys.sizeKey])

		return [{ x, y, size: size !== null && Number.isFinite(size) ? size : null }]
	})
}

/**
 * The ascending unique x values across every visible series — the columns the
 * hover index, crosshair snap, keyboard cursor, and readout all key on, the
 * scatter counterpart of the band charts' categories.
 *
 * @internal
 */
export function uniqueXValues(seriesData: ScatterDatum[][]): number[] {
	const xs = new Set<number>()

	for (const points of seriesData) {
		for (const point of points) xs.add(point.x)
	}

	return [...xs].sort((a, b) => a - b)
}

/**
 * One series' size extent, for the bubble radius scaling; `null` when no point
 * carries a finite size (a plain scatter series).
 *
 * @internal
 */
export function sizeDomain(points: ScatterDatum[]): [number, number] | null {
	const sizes = points.flatMap((point) => (point.size === null ? [] : [point.size]))

	if (sizes.length === 0) return null

	return [Math.min(...sizes), Math.max(...sizes)]
}

/** The diameter range a series scales its bubbles into, from its spec or the defaults. @internal */
export function diameterRange(size?: number, maxSize?: number): [number, number] {
	const low = Math.max(1, size ?? BUBBLE_MIN_DIAMETER)

	return [low, Math.max(low, maxSize ?? BUBBLE_MAX_DIAMETER)]
}

/**
 * A point's radius: bubbles interpolate on the square root of the size — area,
 * not diameter, carries the quantity — between the diameter range's ends over
 * the series' own size extent. A sizeless point (or series) takes the plain
 * marker radius; a degenerate extent reads mid-range, since equal sizes should
 * read equal, not minimal.
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

	if (size === null) return minD / 2

	const [low, high] = [Math.sqrt(Math.max(0, domain[0])), Math.sqrt(Math.max(0, domain[1]))]

	// Half the mid diameter: equal sizes read equal, not minimal.
	if (high === low) return (minD + maxD) / 4

	const t = (Math.sqrt(Math.max(0, size)) - low) / (high - low)

	return (minD + t * (maxD - minD)) / 2
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

/** One snapped column stop: its value-axis screen position and the point behind it. @internal */
export type ScatterSnapStop = { y: number; series: number; datum: number }

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
	// Group each series' stops by x in one pass, so each column reads off the map
	// rather than re-scanning every point — O(points) over the grid instead of
	// O(uniqueXs × points), which turns quadratic on the all-distinct x the docs
	// advertise. Insertion order matches a per-column filter, so the stops stay
	// in point order.
	const byX = seriesData.map((points, series) => {
		const groups = new Map<number, ScatterSnapStop[]>()

		points.forEach((point, datum) => {
			const stop = { y: mapY(point.y), series, datum }

			const stops = groups.get(point.x)

			if (stops) stops.push(stop)
			else groups.set(point.x, [stop])
		})

		return groups
	})

	return uniqueXs.map((x) => byX.flatMap((groups) => groups.get(x) ?? []))
}

/**
 * Per unique x, the visible series' y screen positions — every point at that
 * x, duplicates included — the crosshair's and keyboard cursor's snap targets,
 * shaped exactly like the band charts' snap points. The positions half of
 * {@link scatterSnapStops}, index-aligned with it.
 *
 * @internal
 */
export function scatterSnapColumns(stops: ScatterSnapStop[][]): number[][] {
	return stops.map((column) => column.map((stop) => stop.y))
}

/**
 * The stop nearest `y` in column `index`, or `null` off every stop (an empty
 * column, or no column). The same resolution the snapped tooltip anchors with,
 * so the isolated disc and the readout can never disagree: moving along the
 * column hands both to the next point at the midpoint between stops.
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
 * One series' readout cells, per unique x: each point's formatted y — with its
 * size measure in parentheses where one was read — duplicates at an x joined,
 * and an em-dash where the series has no point there.
 *
 * @internal
 */
export function scatterReadoutValues(
	points: ScatterDatum[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatSize: ((value: number) => string) | null,
): string[] {
	// Group the points by x once so each column's cells read off the map rather than
	// re-scanning every point per unique x — the same de-quadratic pass the snap
	// columns take, keeping point order within a column.
	const byX = new Map<number, ScatterDatum[]>()

	for (const point of points) {
		const group = byX.get(point.x)

		if (group) group.push(point)
		else byX.set(point.x, [point])
	}

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
 * Resolves a pointer coordinate to the index of the nearest center, or `null`
 * with no centers — the scatter counterpart of `nearestBandIndex`, tolerant of
 * the uneven spacing unique x values arrive with.
 *
 * @internal
 */
export function nearestCenterIndex(coord: number, centers: number[]): number | null {
	if (centers.length === 0) return null

	let best = 0

	for (let index = 1; index < centers.length; index++) {
		const center = centers[index] as number

		if (Math.abs(center - coord) < Math.abs((centers[best] as number) - coord)) best = index
	}

	return best
}

/**
 * Arbitrates the held disc against the nearest caught one: the held keeps the
 * win while it stayed caught (a finite distance) and no challenger
 * {@link beatsHeldMark | decisively} closes.
 *
 * @internal
 */
function resolveHeldDisc(
	best: { series: number; datum: number } | null,
	bestDistance: number,
	held: { series: number; datum: number } | null,
	heldDistance: number,
): { series: number; datum: number } | null {
	if (best === null || held === null || !Number.isFinite(heldDistance)) return best

	if (best.series === held.series && best.datum === held.datum) return best

	if (beatsHeldMark(bestDistance * bestDistance, heldDistance * heldDistance)) return best

	return held
}

/**
 * The disc the pointer sits on — its series and datum indices — or `null` off
 * every disc, each disc caught within `slack` of its edge. The nearest disc
 * centre wins where discs overlap, so the isolation lifts the one the pointer
 * is truly on rather than whichever drew first. A `held` disc — the one
 * already emphasised — keeps the win while it stays caught, unless a
 * challenger decisively closes ({@link beatsHeldMark}): the resolution is
 * sticky across the midline between discs rather than flipping on it.
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

	let bestDistance = Number.POSITIVE_INFINITY

	let heldDistance = Number.POSITIVE_INFINITY

	for (let series = 0; series < marks.length; series++) {
		const points = marks[series] as ScatterMark[]

		for (let datum = 0; datum < points.length; datum++) {
			const point = points[datum] as ScatterMark

			const distance = Math.hypot(point.x - x, point.y - y)

			if (distance > point.r + slack) continue

			if (held !== null && series === held.series && datum === held.datum) {
				heldDistance = distance
			}

			if (distance < bestDistance) {
				bestDistance = distance

				best = { series, datum }
			}
		}
	}

	return resolveHeldDisc(best, bestDistance, held, heldDistance)
}

/**
 * Insets the x span so the extreme discs and the end tick labels clear the frame
 * — the horizontal layout's treatment, over a single probe scale. Ticks are
 * range-independent, so the probe answers before the final range is known; a
 * frame too narrow to seat both keeps the span, since a clipped label beats an
 * inverted axis.
 *
 * @remarks The inset is sized to the end labels' half-width, which also seats the
 * extreme discs off the frame edge (a value-axis disc paints a smaller reach than
 * its label spans). The labels themselves then read inward through {@link
 * anchorEndTicks}, so this reservation is really the marks' — reclaiming it for a
 * tighter fit would mean insetting by the widest disc's reach instead, and pulling
 * the same reservation off the y range's top and floor.
 * @internal
 */
export function scatterXRange(
	values: number[],
	options: { tickTarget: number; min?: number; max?: number },
	format: (value: number) => string,
	span: [number, number],
): [number, number] {
	const probe = linearScale({ values, range: span, ...options })

	if (!probe || probe.ticks.length === 0) return span

	const half = (value: number) => (format(value).length * TICK_CHAR_WIDTH) / 2 + GUTTER_EDGE_PAD

	const [from, to] = span

	const insetFrom = Math.max(from, half(probe.ticks[0] as number))

	const insetTo = to - half(probe.ticks.at(-1) as number)

	return insetFrom < insetTo ? [insetFrom, insetTo] : span
}

/** How far a tick's mapped position may sit from a range end and still count as sitting on it. @internal */
const EDGE_EPSILON = 0.5

/**
 * Anchors a value axis's end tick labels inward: `'start'` on the tick sitting at
 * the range start, `'end'` on the one at its end, the interior ticks left centered
 * under their positions. The scatter x axis's floor tick abuts the value gutter
 * and its ceiling tick nears the frame's right edge; centered there, they crowd
 * the y-axis floor label at one corner and butt the frame at the other. Reading
 * the ends inward clears both without a width estimate — the treatment {@link
 * endBandTicks} gives the compact band axis, and which the x axis already honours
 * through {@link ChartAxisTick.anchor}. A tick sitting interior to the range — a
 * pinned domain whose edge carries no tick of its own — keeps the centered
 * default, since only an edge label crowds.
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
