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
import { BUBBLE_MAX_DIAMETER, BUBBLE_MIN_DIAMETER, MARKER_RING_WIDTH } from '../chart-constants'
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
		if (x !== unique.at(-1)) unique.push(x + 0)
	}

	return unique
}

/**
 * The largest size across the sized series, for the bubble radius scaling;
 * `null` when no point carries a finite size that is not negative. Every series
 * scales by this one peak, so one size draws one area in each series. A
 * negative size draws no disc, so it takes no part in the peak.
 *
 * @internal
 */
export function sizePeak(series: ScatterDatum[][]): number | null {
	// One fold, as `linearScale` reads its extent: a spread into `Math.max` copies
	// the sizes and throws past the argument limit of the engine.
	let peak = Number.NEGATIVE_INFINITY

	for (const points of series) {
		for (const { size } of points) {
			if (size !== null && size > peak) peak = size
		}
	}

	return peak >= 0 ? peak : null
}

/** The diameter range a series scales its bubbles into, from its spec or the defaults. @internal */
export function diameterRange(size?: number, maxSize?: number): [number, number] {
	const low = Math.max(1, size ?? BUBBLE_MIN_DIAMETER)

	return [low, Math.max(low, maxSize ?? BUBBLE_MAX_DIAMETER)]
}

/**
 * A bubble's radius. The area of a disc is in proportion to its size, from zero
 * to the {@link sizePeak}, which takes the largest diameter. A size whose disc
 * would be smaller than the smallest diameter takes that diameter, so the disc
 * stays visible. Also:
 *
 * - A size that is not finite (`null`), or a size of zero, takes the smallest
 *   diameter.
 * - A negative size takes `0`, for no disc.
 *
 * @internal
 */
export function sizeRadius(
	size: number | null,
	peak: number | null,
	diameters: [number, number],
): number {
	const [minDiameter, maxDiameter] = diameters

	if (size !== null && size < 0) return 0

	if (size === null || size === 0 || peak === null || peak <= 0) return minDiameter / 2

	return Math.max(minDiameter, maxDiameter * Math.sqrt(size / peak)) / 2
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
 * radius resolved through the `radius` of the series.
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
 * The most grid cells {@link scatterDiscLayers} lays along one axis. A large
 * frame with small discs therefore gets wider cells, not a larger grid.
 *
 * @internal
 */
const GRID_SPAN = 256

/**
 * The distance a disc ring reaches out from the disc edge: half the ring width.
 * The ring paints over any fill in that reach.
 *
 * @internal
 */
const RING_REACH = MARKER_RING_WIDTH / 2

/**
 * The uniform grid that {@link scatterDiscLayers} finds touching discs with.
 * Each cell holds a linked list of its discs in typed arrays, so the grid
 * allocates no list per cell.
 *
 * @internal
 */
type DiscGrid = {
	/** The width and the height of one cell. */
	cell: number
	left: number
	top: number
	columns: number
	rows: number
	/** The first disc of each cell, or -1. */
	head: Int32Array
	/** The next disc after each disc in its cell, or -1. */
	next: Int32Array
	/** The highest layer in each cell, or -1. */
	topLayerByCell: Int32Array
	/** The layer of each disc that the grid holds. */
	layerByDisc: Int32Array
}

/**
 * Builds an empty grid over the discs that draw. Its cells are at least as wide
 * as the largest reach between two discs. A disc can thus touch only discs in
 * its own cell and in the eight cells around it. Returns `null` when no disc
 * draws.
 *
 * @internal
 */
function buildDiscGrid(marks: ScatterMark[]): DiscGrid | null {
	let largest = 0

	let left = Number.POSITIVE_INFINITY

	let top = Number.POSITIVE_INFINITY

	let right = Number.NEGATIVE_INFINITY

	let bottom = Number.NEGATIVE_INFINITY

	for (const mark of marks) {
		if (!drawsMark(mark)) continue

		largest = Math.max(largest, mark.r)

		left = Math.min(left, mark.x)

		right = Math.max(right, mark.x)

		top = Math.min(top, mark.y)

		bottom = Math.max(bottom, mark.y)
	}

	if (largest <= 0) return null

	// A wider cell only adds checks, so the cap on the cell count is safe.
	const cell = Math.max(
		2 * largest + RING_REACH,
		(right - left) / GRID_SPAN,
		(bottom - top) / GRID_SPAN,
	)

	const columns = Math.floor((right - left) / cell) + 1

	const rows = Math.floor((bottom - top) / cell) + 1

	return {
		cell,
		left,
		top,
		columns,
		rows,
		head: new Int32Array(columns * rows).fill(-1),
		next: new Int32Array(marks.length).fill(-1),
		topLayerByCell: new Int32Array(columns * rows).fill(-1),
		layerByDisc: new Int32Array(marks.length),
	}
}

/** Whether a mark draws a disc: a non-positive radius draws nothing. @internal */
function drawsMark(mark: ScatterMark): boolean {
	return mark.r > 0
}

/**
 * Finds the layer for one disc in one cell. That layer is one above the highest
 * disc in the cell that the disc touches. It is `floor` when no such disc is
 * above `floor`.
 *
 * @internal
 */
function findCellLayer(
	grid: DiscGrid,
	marks: ScatterMark[],
	mark: ScatterMark,
	cell: number,
	floor: number,
): number {
	let layer = floor

	for (let other = grid.head[cell] as number; other !== -1; other = grid.next[other] as number) {
		const above = (grid.layerByDisc[other] as number) + 1

		const earlier = marks[other] as ScatterMark

		const reach = mark.r + earlier.r + RING_REACH

		const offsetX = mark.x - earlier.x

		const offsetY = mark.y - earlier.y

		if (above > layer && offsetX * offsetX + offsetY * offsetY < reach * reach) layer = above
	}

	return layer
}

/**
 * Puts one disc in the grid on the lowest layer above every earlier disc that
 * it touches, and returns that layer. A cell with no disc above the layer found
 * so far cannot lift the disc, so the scan skips it.
 *
 * @internal
 */
function placeDisc(grid: DiscGrid, marks: ScatterMark[], index: number): number {
	const mark = marks[index] as ScatterMark

	const column = Math.floor((mark.x - grid.left) / grid.cell)

	const row = Math.floor((mark.y - grid.top) / grid.cell)

	let layer = 0

	for (let near = Math.max(row - 1, 0); near <= Math.min(row + 1, grid.rows - 1); near++) {
		const last = Math.min(column + 1, grid.columns - 1)

		for (let across = Math.max(column - 1, 0); across <= last; across++) {
			const cell = near * grid.columns + across

			if ((grid.topLayerByCell[cell] as number) >= layer) {
				layer = findCellLayer(grid, marks, mark, cell, layer)
			}
		}
	}

	const own = row * grid.columns + column

	grid.layerByDisc[index] = layer

	grid.next[index] = grid.head[own] as number

	grid.head[own] = index

	grid.topLayerByCell[own] = Math.max(grid.topLayerByCell[own] as number, layer)

	return layer
}

/**
 * A series' discs as paint layers, each layer one path `d`. Each disc is a
 * closed subfigure, two half-arcs around its center, and the stroke rings each
 * one, as separate circles do. Marks with a non-positive radius are skipped: a
 * degenerate arc paints nothing and only makes the string longer.
 *
 * One path paints all of its fills before all of its rings. Thus, where two
 * discs of one path overlap, the ring of each disc cuts through the other disc.
 * A disc therefore goes on the layer above the highest layer that holds an
 * earlier disc it touches. Discs in one layer never touch, so the fill-then-ring
 * order of a path cannot show. Layer order keeps the data order of each touching
 * pair. A later disc and its ring thus paint over an earlier disc, as separate
 * circles do. A sparse series is one layer. A dense cloud is a small number of
 * layers, not one node per disc.
 *
 * A plain series shares one radius across every disc. The two arc commands read
 * only the radius, not the center, so they are identical for all of them. The
 * builder caches that suffix and rebuilds it only when a radius changes. One
 * move-to per disc is left as the sole per-mark formatting.
 *
 * @internal
 */
export function scatterDiscLayers(marks: ScatterMark[]): string[] {
	const grid = buildDiscGrid(marks)

	if (!grid) return []

	const layers: string[] = []

	let cachedR = Number.NaN

	let arc = ''

	for (let index = 0; index < marks.length; index++) {
		const mark = marks[index] as ScatterMark

		if (!drawsMark(mark)) continue

		const layer = placeDisc(grid, marks, index)

		if (mark.r !== cachedR) {
			cachedR = mark.r

			const r = coord(mark.r)

			arc = `a ${r} ${r} 0 1 0 ${coord(mark.r * 2)} 0 a ${r} ${r} 0 1 0 ${coord(-mark.r * 2)} 0 Z`
		}

		const disc = `M ${coord(mark.x - mark.r)} ${coord(mark.y)} ${arc}`

		// Accumulate into one buffer per layer, not a per-disc parts array joined
		// at the end: the array is an N-string allocation the concatenation avoids.
		const d = layers[layer]

		layers[layer] = d === undefined ? disc : `${d} ${disc}`
	}

	return layers
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
 * Per unique x, every visible point at that x (duplicates included) with its
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
 * One point's readout text: its formatted y, with its size measure in
 * parentheses where one was read.
 *
 * @internal
 */
export function scatterPointText(
	point: ScatterDatum,
	format: (value: number) => string,
	formatSize: ((value: number) => string) | null,
): string {
	return formatSize && point.size !== null
		? `${format(point.y)} (${formatSize(point.size)})`
		: format(point.y)
}

/**
 * One series' readout cells, per unique x: each point's {@link scatterPointText}.
 * Duplicates at an x are joined, and an em-dash stands where the series has no
 * point there.
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
		const cells = (byX.get(x) ?? []).map((point) => scatterPointText(point, format, formatSize))

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
 * The disc the pointer sits on (its series and datum indices), or `null` off
 * every disc, each disc caught within `slack` of its edge. The nearest disc
 * center wins where discs overlap, so the isolation lifts the one the pointer
 * is truly on rather than whichever drew first. A `held` disc (the one
 * already emphasized) keeps the win while it stays caught, unless a
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
