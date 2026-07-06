/**
 * Pure geometry for the {@link ScatterChart}: row parsing that survives ragged
 * data, the sorted unique-x columns the hover and readout key on, area-true
 * bubble radii, and the point hit test. Independent of React and styling so the
 * mark math is unit-testable in isolation.
 */

import {
	BUBBLE_MAX_DIAMETER,
	BUBBLE_MIN_DIAMETER,
	GUTTER_EDGE_PAD,
	MARKER_RADIUS,
	TICK_CHAR_WIDTH,
} from '../chart-constants'
import { linearScale } from '../chart-scale'
import { READOUT_GAP } from '../chart-series'

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

/**
 * Per unique x, the visible series' y screen positions — every point at that
 * x, duplicates included — the crosshair's and keyboard cursor's snap targets,
 * shaped exactly like the band charts' snap points.
 *
 * @internal
 */
export function scatterSnapColumns(
	seriesData: ScatterDatum[][],
	uniqueXs: number[],
	mapY: (value: number) => number,
): number[][] {
	// Group each series' screen ys by x in one pass, so each column reads its stops
	// off the map rather than re-scanning every point — O(points) over the grid
	// instead of O(uniqueXs × points), which turns quadratic on the all-distinct x
	// the docs advertise. Insertion order matches a per-column filter, so the stops
	// stay in point order.
	const byX = seriesData.map((points) => {
		const groups = new Map<number, number[]>()

		for (const point of points) {
			const ys = groups.get(point.x)

			if (ys) ys.push(mapY(point.y))
			else groups.set(point.x, [mapY(point.y)])
		}

		return groups
	})

	return uniqueXs.map((x) => byX.flatMap((groups) => groups.get(x) ?? []))
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

/** Whether the pointer sits on any point's disc, within `slack` of its edge. @internal */
export function withinScatterMarks(
	marks: ScatterMark[][],
	x: number,
	y: number,
	slack: number,
): boolean {
	return marks.some((points) =>
		points.some((point) => Math.hypot(point.x - x, point.y - y) <= point.r + slack),
	)
}

/**
 * Insets the x span so the centered end tick labels clear the frame — the
 * horizontal layout's treatment, over a single probe scale. Ticks are
 * range-independent, so the probe answers before the final range is known; a
 * frame too narrow to seat both keeps the span, since a clipped label beats an
 * inverted axis.
 *
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
