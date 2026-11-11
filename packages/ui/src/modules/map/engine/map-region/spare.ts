/**
 * What the region under a dot can spare it: the region part of the hit-target
 * rule. `map-cluster/crowd.ts` holds the neighbor part and the list of
 * claimants, `map-geofence.ts` the zone part, and `markTargets` joins them.
 *
 * A figure that suits one shape blankets a smaller one. A zone therefore
 * publishes its own inscribed room, and a dot takes a share of it
 * ({@link AREA_SPARE_FRACTION}). Regions ask the same question of shapes three
 * orders of magnitude apart in area. One figure for every region is safe only
 * at the small end. A state with room to spare then takes the same bite as one
 * with none. A dot over open water pays as much as either.
 *
 * Thus each dot asks what regions draw near it. The module resolves a region
 * off a pointed DOM element, not off a coordinate. But the canonical fit draws
 * each ring of each region at one place, and a measured frame is that fit under
 * one transform. A grid over those rings therefore answers a dot at each box
 * and at each zoom, and a resize builds nothing.
 *
 * Frame arithmetic with no React in it, like the rest of the engine.
 */

import { clamp } from '../../../../utilities/clamp'
import { getOrCompute } from '../../../../utilities/get-or-compute'
import { AREA_SPARE_FRACTION, POINT_HIT_RADIUS, POINT_RADIUS } from '../map-constants'
import type { StaticMapGeometry } from '../map-geometry/cache'
import { areaReach, boxNear, type MapFrameBox } from '../map-geometry/mark'
import { bufferBounds, drawRings, frameAffine, type MapDrawnRings } from '../map-geometry/projected'
import { invertTransform, MAP_FIT_TRANSFORM, type MapTransform } from '../map-zoom/transform'
import type { MapPoint2D } from '../types'

/**
 * How much reach the region layer leaves a dot at a frame position, in device
 * pixels. It is `Infinity` where it claims nothing, which is the identity of
 * the minimum `markTargets` folds every claimant into.
 *
 * @internal
 */
export type MapRegionSpare = (at: MapPoint2D, unitsPerPixel: number) => number

/**
 * The resolver for a layer that answers nothing. Exported so the plat can state
 * that case itself. Whether the regions answer the pointer is its own policy,
 * and a geometry leaf must not take a boolean about a component's props.
 *
 * @internal
 */
export const NO_REGION_CLAIM: MapRegionSpare = () => Number.POSITIVE_INFINITY

/**
 * How many cells the grid has along the longer side of the canonical frame. At
 * 32, the widest target of a dot covers 2 to 20 cells from a phone to a wide
 * desktop, and a cell of a county atlas holds about ten rings.
 *
 * @internal
 */
const RING_GRID_CELLS = 32

/**
 * The rings of a geography as the canonical fit draws them, filed in a grid
 * over the canonical frame. A region is here as the cells that its rings reach,
 * the boxes of those rings, and the room that it holds.
 *
 * The grid files rings, not regions, because a ring is what a dot stands near.
 * A state with islands is one region and 137 boxes. A box around all of them
 * holds the water between them, and a dot on that water would pay for a region
 * that draws nowhere near it.
 *
 * @internal
 */
type RingGrid = {
	/** The drawn rings, in the units of the pass that drew them. */
	rings: MapDrawnRings
	/** The scale and the offset that carry those units onto the canonical frame. */
	factor: number
	dx: number
	dy: number
	/** The side of one cell, in canonical frame units. */
	cell: number
	columns: number
	rows: number
	/** The rings that reach each cell, row after row. */
	cells: GridRing[][]
	/** The inscribed reach of each region in canonical frame units, `NaN` until a dot asks. */
	reach: Float64Array
}

/**
 * One ring as the grid files it: its box in canonical frame units, and the
 * region that owns it. The two are one record, so a cell cannot read the box of
 * one ring against the region of another.
 *
 * @internal
 */
type GridRing = MapFrameBox & { region: number }

/** The grid index along one axis, held inside the grid. @internal */
function cellAt(position: number, cell: number, count: number): number {
	return clamp(Math.floor(position / cell), 0, count - 1)
}

/**
 * The first and the last column that one ring reaches in each row of the grid.
 * The rows that the box of the ring meets hold its spans, and the other rows
 * hold those of earlier rings. One pair of arrays serves each ring of a build
 * in turn.
 *
 * @internal
 */
type RowSpans = { first: Int32Array; last: Int32Array }

/**
 * Measures the span of one ring in each row that its box meets: the columns
 * between the first and the last cell that its outline reaches there.
 *
 * The outline of a closed ring passes on each side of each point that the ring
 * draws on. The span of a row therefore holds the whole of the ring in that
 * row, and not only its outline.
 *
 * An edge widens each row between the rows of its two ends by the columns of
 * those ends. That is the box of the edge, which is more than a long diagonal
 * edge draws on. The rings of an atlas are made of short edges.
 *
 * A ring whose box stands in one row or in one column reaches each cell of that
 * box, so its outline needs no walk. A county atlas is made of such rings, and
 * the rule saves it most of the walk.
 *
 * @internal
 */
function spanRing(
	grid: RingGrid,
	ring: GridRing,
	from: number,
	end: number,
	{ first, last }: RowSpans,
): void {
	const { points } = grid.rings

	const { factor, dx, dy, cell, columns, rows } = grid

	const firstRow = cellAt(ring.top, cell, rows)

	const endRow = cellAt(ring.bottom, cell, rows) + 1

	const firstColumn = cellAt(ring.left, cell, columns)

	const lastColumn = cellAt(ring.right, cell, columns)

	if (endRow - firstRow === 1 || firstColumn === lastColumn) {
		first.fill(firstColumn, firstRow, endRow)

		last.fill(lastColumn, firstRow, endRow)

		return
	}

	first.fill(columns, firstRow, endRow)

	last.fill(-1, firstRow, endRow)

	// The edge that closes the ring starts at its last point.
	let fromColumn = cellAt((points[end * 2 - 2] as number) * factor + dx, cell, columns)

	let fromRow = cellAt((points[end * 2 - 1] as number) * factor + dy, cell, rows)

	for (let point = from; point < end; point++) {
		const column = cellAt((points[point * 2] as number) * factor + dx, cell, columns)

		const row = cellAt((points[point * 2 + 1] as number) * factor + dy, cell, rows)

		const lastRow = Math.max(fromRow, row)

		for (let crossed = Math.min(fromRow, row); crossed <= lastRow; crossed++) {
			first[crossed] = Math.min(first[crossed] as number, fromColumn, column)

			last[crossed] = Math.max(last[crossed] as number, fromColumn, column)
		}

		fromColumn = column

		fromRow = row
	}
}

/**
 * Files a ring in each cell of its row spans.
 *
 * The box of a ring holds ground that the ring does not draw on: the corner
 * that a diagonal coast leaves, or the inside of a bend. A dot there stands in
 * the box and far from the shape. A ring filed by its box made that dot answer
 * to a region that its target cannot cover.
 *
 * @internal
 */
function fileRing(grid: RingGrid, ring: GridRing, { first, last }: RowSpans): void {
	const { cell, columns, rows, cells } = grid

	const lastRow = cellAt(ring.bottom, cell, rows)

	for (let row = cellAt(ring.top, cell, rows); row <= lastRow; row++) {
		const lastColumn = last[row] as number

		for (let column = first[row] as number; column <= lastColumn; column++) {
			cells[row * columns + column]?.push(ring)
		}
	}
}

/**
 * Builds the grid over one geometry entry, or `null` where nothing was fitted.
 *
 * The rings come from the buffer of the entry where it stands, as the canonical
 * paths do (`cachedCanonicalPaths`). That is a scan of numbers that the mount
 * already paid for, with no projection in it: one pass for the box of a ring,
 * and one for its spans where the box stands in more than one row and column.
 * Where the buffer does not stand, one walk draws the area rings at the
 * canonical fit.
 *
 * A ring of fewer than three points encloses nothing, so no cell holds it.
 *
 * @internal
 */
function buildRingGrid({ canonical, atlas, features }: StaticMapGeometry): RingGrid | null {
	if (canonical === null) return null

	const affine = atlas === null ? null : frameAffine(atlas, canonical.projection)

	const rings =
		atlas === null || affine === null ? drawRings(features, canonical.projection) : atlas

	const { factor, dx, dy } = affine ?? { factor: 1, dx: 0, dy: 0 }

	const cell = Math.max(canonical.width, canonical.height) / RING_GRID_CELLS

	const columns = Math.ceil(canonical.width / cell)

	const rows = Math.ceil(canonical.height / cell)

	const grid: RingGrid = {
		rings,
		factor,
		dx,
		dy,
		cell,
		columns,
		rows,
		cells: Array.from({ length: columns * rows }, () => []),
		reach: new Float64Array(rings.regionRing.length - 1).fill(Number.NaN),
	}

	const spans: RowSpans = { first: new Int32Array(rows), last: new Int32Array(rows) }

	for (let region = 0; region + 1 < rings.regionRing.length; region++) {
		const endRing = rings.regionRing[region + 1] as number

		for (let ring = rings.regionRing[region] as number; ring < endRing; ring++) {
			const from = rings.ringStart[ring] as number

			const end = rings.ringStart[ring + 1] as number

			if (end - from < 3) continue

			const [x0, y0, x1, y1] = bufferBounds(rings.points, from, end)

			const filed: GridRing = {
				left: x0 * factor + dx,
				top: y0 * factor + dy,
				right: x1 * factor + dx,
				bottom: y1 * factor + dy,
				region,
			}

			spanRing(grid, filed, from, end, spans)

			fileRing(grid, filed, spans)
		}
	}

	return grid
}

// The grid of each geometry entry. The entry is shared across instances and
// mounts, and its canonical fit never moves, so the grid is built one time for
// an atlas, an object, and a projection.
const grids = new WeakMap<StaticMapGeometry, RingGrid | null>()

/**
 * The room that a region holds, in canonical frame units: measured on the first
 * dot that stands near one of its rings, and held from there.
 *
 * `areaReach` reads points, so the rings of the one region become points for
 * the measure and go to garbage after it. The dots of a map stand near few of
 * its regions.
 *
 * @internal
 */
function regionReach(grid: RingGrid, region: number): number {
	const held = grid.reach[region] as number

	if (!Number.isNaN(held)) return held

	const { points, ringStart, regionRing } = grid.rings

	const rings: { points: MapPoint2D[] }[] = []

	const endRing = regionRing[region + 1] as number

	for (let ring = regionRing[region] as number; ring < endRing; ring++) {
		const ringPoints: MapPoint2D[] = []

		const end = ringStart[ring + 1] as number

		for (let point = ringStart[ring] as number; point < end; point++) {
			ringPoints.push({ x: points[point * 2] as number, y: points[point * 2 + 1] as number })
		}

		rings.push({ points: ringPoints })
	}

	const measured = areaReach(rings) * grid.factor

	grid.reach[region] = measured

	return measured
}

/** The rings of a cell that the grid does not hold. @internal */
const NO_RINGS: readonly GridRing[] = []

/**
 * The tightest share among the rings of one cell that draw within `reach` of a
 * dot, or `Infinity` where none does.
 *
 * A ring that reaches two cells arrives two times. The minimum reads the same
 * after a repeat, so a repeat costs one box test.
 *
 * @internal
 */
function cellRoom(
	grid: RingGrid,
	rings: readonly GridRing[],
	spot: MapPoint2D,
	reach: number,
	unit: number,
): number {
	let tightest = Number.POSITIVE_INFINITY

	for (const ring of rings) {
		if (!boxNear(ring, spot, reach)) continue

		const held = regionReach(grid, ring.region)

		tightest = Math.min(tightest, (held / unit) * AREA_SPARE_FRACTION)

		// `markTargets` floors every claim at what the dot paints, so once the
		// tightest region has driven the budget there, no further ring can move it.
		if (tightest <= POINT_RADIUS) break
	}

	return tightest
}

/**
 * How much room the rings of a grid leave one dot. The dot and its reach go to
 * the canonical frame, where the grid is. The answer is in device pixels, so it
 * reads the same from either frame.
 *
 * @internal
 */
function gridRoom(
	grid: RingGrid,
	frame: MapTransform,
	at: MapPoint2D,
	unitsPerPixel: number,
): number {
	const spot = invertTransform(at, frame)

	const unit = unitsPerPixel / frame.k

	// The widest target any pointer takes, in canonical units: the band inside
	// which a ring is worth asking about at all.
	const reach = POINT_HIT_RADIUS * unit

	const { cell, columns, rows, cells } = grid

	const firstColumn = cellAt(spot.x - reach, cell, columns)

	const lastColumn = cellAt(spot.x + reach, cell, columns)

	const lastRow = cellAt(spot.y + reach, cell, rows)

	let room = Number.POSITIVE_INFINITY

	for (let row = cellAt(spot.y - reach, cell, rows); row <= lastRow; row++) {
		for (let column = firstColumn; column <= lastColumn; column++) {
			const rings = cells[row * columns + column] ?? NO_RINGS

			room = Math.min(room, cellRoom(grid, rings, spot, reach, unit))

			if (room <= POINT_RADIUS) return room
		}
	}

	return room
}

/**
 * Resolves how much room the region layer leaves each dot, over one geometry
 * entry under one measured fit.
 *
 * A dot answers to every region its target could cover rather than to the one it
 * stands in. That is the zone half's own reading, where a dot overlapping two
 * zones satisfies both. It is what keeps a dot just inside a large state from
 * blanketing the small one across the border.
 *
 * Containment is never tested. The cells and the box test ask whether a ring
 * draws within the reach of the dot, which is the question the claim actually
 * turns on. A dot outside a region but near enough to cover part of it takes
 * that region's ground as surely as one standing in the middle.
 *
 * @param geometry - The geometry entry that the plat draws.
 * @param frame - The measured fit, `null` while the frame is the canonical one.
 * @returns The per-dot resolver. {@link NO_REGION_CLAIM} where the layer answers
 * nothing, which is the caller's call and not this one's.
 *
 * @internal
 */
export function regionSpare(
	geometry: StaticMapGeometry,
	frame: MapTransform | null,
): MapRegionSpare {
	// The canonical frame is the canonical fit under the identity transform.
	const drawn = frame ?? MAP_FIT_TRANSFORM

	return (at, unitsPerPixel) => {
		// Read here rather than at build time, so a map that draws no dot-shaped mark
		// never builds a grid. It memoizes on the entry, so the lookup is all this
		// costs after the first dot.
		const grid = getOrCompute(grids, geometry, buildRingGrid)

		return grid === null ? Number.POSITIVE_INFINITY : gridRoom(grid, drawn, at, unitsPerPixel)
	}
}
