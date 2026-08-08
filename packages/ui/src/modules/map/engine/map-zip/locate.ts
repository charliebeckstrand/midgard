/**
 * Which region a position lands in, over a grid that keeps the question cheap.
 * The coverage pass asks it once for every code in a territory, and the atlas
 * behind it is a county one — thousands of rings — so a walk of the features
 * would cost thousands of `geoContains` calls for each code.
 *
 * The grid holds bounding boxes rather than geometry. A box is a conservative
 * test: a position outside it is outside the region for certain, and a position
 * inside it still has to face `geoContains`. So the grid never decides the
 * answer, it only takes the candidates down to the two or three whose boxes
 * cover the cell, and the exact test settles those.
 *
 * The boxes come from a plain walk of the coordinates rather than from
 * `geoBounds`. A prefilter needs a box that is never too small, not one that is
 * exactly right, and the plain walk is the faster of the two. A region crossing
 * the antimeridian — an Alaska borough — reads as spanning every longitude under
 * that walk, which is too wide rather than too narrow, so it stays correct and
 * merely joins the oversized list below.
 */

import { geoContains } from 'd3-geo'
import type { LngLat, MapFeature } from '../types'

/** A conservative lon/lat box around a shape. @internal */
export type MapBounds = { west: number; south: number; east: number; north: number }

/** The internal spelling, so the walk below reads without the exported name. @internal */
type Bounds = MapBounds

/**
 * The grid's cell size in degrees. A US county mostly fits inside one cell, so a
 * lookup usually reads a handful of candidates and a region claims a handful of
 * cells.
 *
 * @internal
 */
const CELL_DEGREES = 1

/**
 * How many cells one region can claim before it goes in the oversized list
 * instead. A box spanning the world would otherwise write 64,800 entries, which
 * is what an antimeridian-crossing region reads as under the walk above. The
 * oversized list is tested on every lookup, so it must stay short — and it does,
 * because only a handful of regions are ever that wide.
 *
 * @internal
 */
const MAX_CELLS_PER_REGION = 64

/** Degrees of longitude west of Greenwich, so a cell column is never negative. @internal */
const LONGITUDE_ORIGIN = 180

/** Degrees of latitude south of the equator, so a cell row is never negative. @internal */
const LATITUDE_ORIGIN = 90

/** How many cell columns cover the sphere; the stride between one row and the next. @internal */
const GRID_COLUMNS = Math.ceil((LONGITUDE_ORIGIN * 2) / CELL_DEGREES)

/**
 * A spatial index over a feature list: the regions whose box covers each grid
 * cell, the regions too wide to bucket, and every box for the exact test to
 * shortcut on.
 *
 * @internal
 */
export type MapRegionIndex = {
	cells: Map<number, number[]>
	oversized: number[]
	bounds: (Bounds | null)[]
}

/** Widens a box to hold one position. @internal */
function extend(box: Bounds, lon: number, lat: number): void {
	if (lon < box.west) box.west = lon

	if (lon > box.east) box.east = lon

	if (lat < box.south) box.south = lat

	if (lat > box.north) box.north = lat
}

/**
 * Widens a box to hold every position under a coordinates node, at whatever
 * depth they sit: a ring nests one deep, a polygon two, a multipolygon three.
 * The recursion reads the depth off the data rather than off the geometry type,
 * so one walk serves all three.
 *
 * @internal
 */
function walk(node: unknown, box: Bounds): void {
	if (!Array.isArray(node)) return

	if (typeof node[0] === 'number') {
		const [lon, lat] = node as number[]

		if (lon !== undefined && lat !== undefined) extend(box, lon, lat)

		return
	}

	for (const child of node) walk(child, box)
}

/**
 * The conservative box around a feature's coordinates, or `null` where it has
 * none. A plain min/max walk, so it costs a fraction of what the spherical
 * measurements over the same coordinates cost.
 *
 * @internal
 */
export function featureBounds(shape: MapFeature): Bounds | null {
	const geometry = shape.geometry as { coordinates?: unknown } | null

	if (geometry?.coordinates === undefined) return null

	const box: Bounds = {
		west: Number.POSITIVE_INFINITY,
		south: Number.POSITIVE_INFINITY,
		east: Number.NEGATIVE_INFINITY,
		north: Number.NEGATIVE_INFINITY,
	}

	walk(geometry.coordinates, box)

	return Number.isFinite(box.west) && Number.isFinite(box.south) ? box : null
}

/** The grid column a longitude falls in. @internal */
function columnAt(lon: number): number {
	return Math.floor((lon + LONGITUDE_ORIGIN) / CELL_DEGREES)
}

/** The grid row a latitude falls in. @internal */
function rowAt(lat: number): number {
	return Math.floor((lat + LATITUDE_ORIGIN) / CELL_DEGREES)
}

/** The cell a lon/lat falls in, as one number so the map keys without a string. @internal */
function cellAt(lon: number, lat: number): number {
	return rowAt(lat) * GRID_COLUMNS + columnAt(lon)
}

/**
 * Builds the index over a feature list. One pass over the coordinates, so it
 * costs what reading the atlas once costs and nothing per lookup afterwards.
 *
 * @internal
 */
export function regionIndex(features: MapFeature[]): MapRegionIndex {
	const cells = new Map<number, number[]>()

	const oversized: number[] = []

	const bounds = features.map(featureBounds)

	bounds.forEach((box, region) => {
		if (box === null) return

		// The corner cells, not the box's own width in cells: a box narrower than
		// one cell still spans two of them wherever it crosses the line between
		// them, and a region bucketed by its width alone would be missing from the
		// cell its own ground covers.
		const firstColumn = columnAt(box.west)

		const lastColumn = columnAt(box.east)

		const firstRow = rowAt(box.south)

		const lastRow = rowAt(box.north)

		if ((lastColumn - firstColumn + 1) * (lastRow - firstRow + 1) > MAX_CELLS_PER_REGION) {
			oversized.push(region)

			return
		}

		for (let row = firstRow; row <= lastRow; row++) {
			for (let column = firstColumn; column <= lastColumn; column++) {
				const key = row * GRID_COLUMNS + column

				const held = cells.get(key)

				if (held === undefined) cells.set(key, [region])
				else held.push(region)
			}
		}
	})

	return { cells, oversized, bounds }
}

// The index per decoded feature list. Building it walks every coordinate in the
// atlas, which on a county one is the same order of work as drawing it, so a
// second map over the same atlas — or a remount of the first — must not pay it
// again. The feature list keys it, so the entry outlives every refit: a bounding
// box is geographic, not projected.
const indexes = new WeakMap<MapFeature[], MapRegionIndex>()

/**
 * The index over a feature list, memoised on the list and built on the first
 * read. Nothing on the map's own mount path reads it — only a coverage pass
 * does — so a map that draws no territory never builds one.
 *
 * @internal
 */
export function cachedRegionIndex(features: MapFeature[]): MapRegionIndex {
	const hit = indexes.get(features)

	if (hit !== undefined) return hit

	const built = regionIndex(features)

	indexes.set(features, built)

	return built
}

/** Whether a box holds a position — the cheap test before the exact one. @internal */
function within(box: Bounds | null, [lon, lat]: LngLat): boolean {
	return box !== null && lon >= box.west && lon <= box.east && lat >= box.south && lat <= box.north
}

/**
 * Which region holds a position, as an index into the feature list, or `-1`
 * where none does. The first region whose ring contains the position wins;
 * atlas regions do not overlap, so there is never a second.
 *
 * @param index - The built grid.
 * @param features - The same feature list the grid was built over.
 * @param at - The position to place.
 * @returns The region's index, or `-1`.
 *
 * @internal
 */
/**
 * Every region whose box meets a box, as indices into the feature list. A
 * conservative answer over conservative boxes: it can name a region the shape
 * does not touch, and never miss one it does.
 *
 * That one-sided error is what makes it useful. A caller cannot conclude from
 * this that a region holds a shape, but it can conclude that no region outside
 * the result does — so where every named region agrees on something, the exact
 * test can only agree with them, and never has to run.
 *
 * @internal
 */
export function regionsMeeting(index: MapRegionIndex, box: MapBounds): Set<number> {
	const met = new Set<number>()

	const keep = (candidates: Iterable<number>) => {
		for (const region of candidates) {
			if (overlaps(index.bounds[region] ?? null, box)) met.add(region)
		}
	}

	// The wide regions face the same box test as the bucketed ones. Kept
	// unfiltered they would join every result, and a caller reading the result for
	// agreement would never find any.
	keep(index.oversized)

	const lastRow = rowAt(box.north)

	const lastColumn = columnAt(box.east)

	for (let row = rowAt(box.south); row <= lastRow; row++) {
		for (let column = columnAt(box.west); column <= lastColumn; column++) {
			keep(index.cells.get(row * GRID_COLUMNS + column) ?? [])
		}
	}

	return met
}

/** Whether two boxes meet — the cheap test the query above filters its cells with. @internal */
function overlaps(box: Bounds | null, other: MapBounds): boolean {
	return (
		box !== null &&
		box.west <= other.east &&
		box.east >= other.west &&
		box.south <= other.north &&
		box.north >= other.south
	)
}

export function regionAt(index: MapRegionIndex, features: MapFeature[], at: LngLat): number {
	const holder = (candidates: number[]): number => {
		for (const region of candidates) {
			if (!within(index.bounds[region] ?? null, at)) continue

			if (geoContains(features[region] as Parameters<typeof geoContains>[0], at)) return region
		}

		return -1
	}

	const cell = holder(index.cells.get(cellAt(at[0], at[1])) ?? [])

	return cell === -1 ? holder(index.oversized) : cell
}
