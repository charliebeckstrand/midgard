import { geoArea } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { GEOFENCE_CIRCLE_STEPS } from '../../modules/map/engine/map-constants'
import {
	areaAnchor,
	areaReach,
	dotPath,
	linePath,
	projectArea,
	projectPoint,
	ringAnchor,
	ringsNear,
	ringsPath,
} from '../../modules/map/engine/map-geometry/mark'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { geographyFeatures } from '../../modules/map/engine/map-geometry/topology'
import { rewindFeatures } from '../../modules/map/engine/map-geometry/winding'
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
import type { MapFeature } from '../../modules/map/engine/types'
import { FIXTURE_GEOJSON, FIXTURE_TOPOLOGY } from '../helpers/map-geography'

/** Half the sphere in steradians: an exterior ring's area stays under this once rewound. */
const HALF_SPHERE = 2 * Math.PI

/** A d3-convention exterior ring (clockwise in lon/lat): a small unit-ish square. */
const CW_EXTERIOR = [
	[0, 0],
	[0, 10],
	[10, 10],
	[10, 0],
	[0, 0],
]

/** The spherical area of a feature's first Polygon ring, read as its own polygon. */
function firstRingArea(feature: MapFeature): number {
	const ring = (feature.geometry as { coordinates: number[][][] }).coordinates[0]

	return geoArea({ type: 'Polygon', coordinates: [ring] } as never)
}

/** A single-Polygon feature from its rings. */
function polygonFeature(id: string, coordinates: number[][][]): MapFeature {
	return { type: 'Feature', id, geometry: { type: 'Polygon', coordinates } }
}

describe('geographyFeatures', () => {
	it('passes a GeoJSON collection through', () => {
		expect(geographyFeatures(FIXTURE_GEOJSON)).toBe(FIXTURE_GEOJSON.features)
	})

	it("decodes a topology's first object by default", () => {
		const features = geographyFeatures(FIXTURE_TOPOLOGY)

		expect(features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])

		expect(features.map((entry) => entry.properties?.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
	})

	it('decodes a named topology object', () => {
		expect(geographyFeatures(FIXTURE_TOPOLOGY, 'states')).toHaveLength(3)
	})

	it('yields nothing for an unknown object name', () => {
		expect(geographyFeatures(FIXTURE_TOPOLOGY, 'counties')).toEqual([])
	})

	it('decodes the topology to the same shapes as the GeoJSON twin', () => {
		const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

		const fromTopology = regionPaths(geographyFeatures(FIXTURE_TOPOLOGY), projection)

		const fromGeoJson = regionPaths(FIXTURE_GEOJSON.features, projection)

		expect(fromTopology).toEqual(fromGeoJson)
	})
})

describe('rewindFeatures', () => {
	it('passes an already-correct collection through untouched', () => {
		// The fixture exteriors already follow d3's winding, so every feature is
		// returned by identity — nothing is cloned.
		const features = rewindFeatures(FIXTURE_GEOJSON.features)

		expect(features).toBe(FIXTURE_GEOJSON.features)
	})

	it('reverses an exterior ring wound opposite d3 (RFC 7946 counter-clockwise)', () => {
		const misWound = polygonFeature('X', [[...CW_EXTERIOR].reverse()])

		// The mis-wound exterior reads as almost the whole sphere before rewinding.
		expect(firstRingArea(misWound)).toBeGreaterThan(HALF_SPHERE)

		const [fixed] = rewindFeatures([misWound])

		expect(fixed).toBeDefined()

		// After rewinding it encloses the small region it should, and the source
		// ring was cloned rather than reversed in place.
		expect(firstRingArea(fixed as MapFeature)).toBeLessThan(HALF_SPHERE)

		expect((misWound.geometry as { coordinates: number[][][] }).coordinates[0]).toEqual(
			[...CW_EXTERIOR].reverse(),
		)
	})

	it('gives an interior ring the opposite winding of its exterior', () => {
		// Exterior wound d3-correctly; a hole wound the same way must be flipped so
		// the two enclose opposite sides.
		const hole = [
			[3, 3],
			[3, 6],
			[6, 6],
			[6, 3],
			[3, 3],
		]

		const feature = polygonFeature('H', [CW_EXTERIOR, hole])

		const [fixed] = rewindFeatures([feature])

		const rings = ((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates

		// Exterior unchanged, hole reversed relative to the input.
		expect(rings[0]).toEqual(CW_EXTERIOR)

		expect(rings[1]).toEqual([...hole].reverse())
	})

	it('drops a degenerate collinear ring', () => {
		// Collinear points enclose ~0 one winding and ~4π the other — junk either
		// way, and the read that flooded the frame in practice.
		const collinear = [
			[0, 0],
			[1, 0],
			[2, 0],
			[3, 0],
			[0, 0],
		]

		const feature = polygonFeature('D', [CW_EXTERIOR, collinear])

		const [fixed] = rewindFeatures([feature])

		const rings = ((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates

		expect(rings).toHaveLength(1)

		expect(rings[0]).toEqual(CW_EXTERIOR)
	})

	it('empties a polygon whose exterior is a degenerate ring', () => {
		const collinear = [
			[0, 0],
			[1, 0],
			[2, 0],
			[0, 0],
		]

		const [fixed] = rewindFeatures([polygonFeature('E', [collinear])])

		expect(((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates).toEqual(
			[],
		)
	})

	it('rewinds each polygon of a MultiPolygon', () => {
		const shifted = CW_EXTERIOR.map(([lng, lat]) => [(lng as number) + 20, lat as number])

		const feature: MapFeature = {
			type: 'Feature',
			id: 'M',
			geometry: {
				type: 'MultiPolygon',
				coordinates: [[[...CW_EXTERIOR].reverse()], [shifted]],
			},
		}

		const [fixed] = rewindFeatures([feature])

		const polygons = ((fixed as MapFeature).geometry as { coordinates: number[][][][] }).coordinates

		// The first polygon's mis-wound exterior is flipped; the second, already
		// correct, is left as it stands.
		expect(polygons[0]?.[0]).toEqual(CW_EXTERIOR)

		expect(polygons[1]?.[0]).toEqual(shifted)
	})

	it('leaves non-polygonal geometry alone', () => {
		const point: MapFeature = {
			type: 'Feature',
			id: 'P',
			geometry: { type: 'Point', coordinates: [5, 5] },
		}

		const features = [point]

		expect(rewindFeatures(features)).toBe(features)
	})

	it('leaves a ring measuring exactly half the sphere wound as it arrived', () => {
		// The value the winding rule's three-way comparison leaves alone under both
		// readings, and the reason the planar shortcut refuses a span of exactly
		// 180° rather than merely above it: inside a narrower lune this area is
		// unreachable, and at exactly 180° it is not.
		const lune = [
			[-90, -90],
			[90, -90],
			[90, 90],
			[-90, 90],
			[-90, -90],
		]

		const feature = polygonFeature('L', [lune])

		expect(firstRingArea(feature)).toBeCloseTo(HALF_SPHERE, 10)

		const [fixed] = rewindFeatures([feature])

		expect(
			((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates[0],
		).toEqual(lune)
	})

	it('keeps a sliver whose planar area is zero but whose spherical area is not', () => {
		// Collinear along a parallel, so the shoelace cancels to exactly 0 while
		// the sphere measures ~4.6e-6 sr — thousands of times the degenerate
		// epsilon, and d3 draws it. The drop decision therefore stays on the
		// spherical measure whatever the plane reports.
		const alongParallel = [
			[0, 60],
			[2, 60],
			[4, 60],
			[0, 60],
		]

		const feature = polygonFeature('S', [CW_EXTERIOR, alongParallel])

		const [fixed] = rewindFeatures([feature])

		const rings = ((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates

		expect(rings).toHaveLength(2)

		expect(rings[1]).toEqual(alongParallel)
	})

	it('rewinds a ring too wide for the plane to judge', () => {
		// A lune wider than 180° may enclose a pole, where the planar sign stops
		// tracking the spherical side, so the exact measure decides — and it must
		// still fix a mis-wound exterior.
		const wide = [
			[-170, -10],
			[-170, 10],
			[170, 10],
			[170, -10],
			[-170, -10],
		]

		const feature = polygonFeature('W', [wide])

		const before = firstRingArea(feature)

		const [fixed] = rewindFeatures([feature])

		const after = firstRingArea(fixed as MapFeature)

		expect(after).toBeLessThan(HALF_SPHERE)

		// Reversed exactly when the exact measure said it enclosed the far side.
		expect(
			((fixed as MapFeature).geometry as { coordinates: number[][][] }).coordinates[0],
		).toEqual(before > HALF_SPHERE ? [...wide].reverse() : wide)
	})

	it('rewinds a ring that encloses a pole', () => {
		// Every longitude, so the plane cannot see the pole inside it at all.
		const capped = [
			[-180, 80],
			[-90, 80],
			[0, 80],
			[90, 80],
			[180, 80],
			[180, 89],
			[-180, 89],
			[-180, 80],
		]

		const feature = polygonFeature('P', [capped])

		const [fixed] = rewindFeatures([feature])

		expect(firstRingArea(fixed as MapFeature)).toBeLessThan(HALF_SPHERE)
	})
})

describe('regionPaths', () => {
	it('draws one path per feature', () => {
		const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

		const paths = regionPaths(FIXTURE_GEOJSON.features, projection)

		expect(paths).toHaveLength(3)

		for (const d of paths) {
			expect(d).toMatch(/^M/)
		}
	})

	it('yields null for a feature with no geometry', () => {
		const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

		const bare = { type: 'Feature', id: 'X', geometry: null } as const

		expect(regionPaths([bare], projection)).toEqual([null])
	})
})

describe('projectPoint', () => {
	it('projects a position inside the fitted frame', () => {
		const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

		const point = projectPoint(projection, [5, 5])

		expect(point).not.toBeNull()

		expect(point?.x).toBeGreaterThan(0)

		expect(point?.x).toBeLessThan(300)
	})

	it('is null where the projection has no image', () => {
		// The US composite drops coordinates outside its insets — London here.
		const projection = fitMapProjection('albers-usa', [], 300, 100)

		expect(projectPoint(projection, [-0.13, 51.5])).toBeNull()
	})
})

describe('dotPath', () => {
	it('draws a zero-length segment at the rounded position', () => {
		// The round linecap paints the dot; two decimals match linePath's rounding.
		expect(dotPath({ x: 12.3456, y: 7.891 })).toBe('M12.35,7.89l0,0')
	})
})

describe('linePath', () => {
	const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

	const project = (position: [number, number]) => projectPoint(projection, position)

	it('draws a move-then-line path through the points', () => {
		const d = linePath(
			[
				[2, 2],
				[15, 5],
				[28, 8],
			],
			project,
		)

		expect(d).toMatch(/^M[-\d.]+,[-\d.]+L/)

		expect(d.split('L')).toHaveLength(3)
	})

	it('skips points the projector drops', () => {
		const gappy = (position: [number, number]) => (position[0] === 15 ? null : project(position))

		const d = linePath(
			[
				[2, 2],
				[15, 5],
				[28, 8],
			],
			gappy,
		)

		expect(d.split('L')).toHaveLength(2)
	})

	it('is empty when fewer than two points survive', () => {
		expect(linePath([[2, 2]], project)).toBe('')

		expect(linePath([], project)).toBe('')

		expect(
			linePath(
				[
					[2, 2],
					[15, 5],
				],
				() => null,
			),
		).toBe('')
	})
})

describe('ringsPath · one ring', () => {
	const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

	const project = (position: [number, number]) => projectPoint(projection, position)

	const SQUARE: [number, number][] = [
		[2, 2],
		[2, 8],
		[28, 8],
		[28, 2],
	]

	/** The pair a geofence draws one ring through: project it, then draw it. */
	const ring = (
		points: [number, number][],
		projector: (position: [number, number]) => { x: number; y: number } | null = project,
	) => ringsPath(projectArea([[points]], projector))

	it('closes the path it draws through the points', () => {
		const d = ring(SQUARE)

		expect(d).toMatch(/^M[-\d.]+,[-\d.]+L/)

		expect(d.endsWith('Z')).toBe(true)
	})

	it('is linePath plus the closing command, so the two can never diverge', () => {
		expect(ring(SQUARE)).toBe(`${linePath(SQUARE, project)}Z`)
	})

	it('draws a ring whose closing repeat is already present', () => {
		// A GeoJSON ring repeats its first position; the repeat costs one
		// zero-length segment and must never open a gap.
		const closed: [number, number][] = [...SQUARE, SQUARE[0] as [number, number]]

		const d = ring(closed)

		expect(d.endsWith('Z')).toBe(true)

		expect(d.split('L')).toHaveLength(5)
	})

	it('skips points the projector drops', () => {
		// One corner dropped leaves three, which still encloses an area.
		const gappy = (position: [number, number]) =>
			position[0] === 2 && position[1] === 8 ? null : project(position)

		expect(ring(SQUARE, gappy).split('L')).toHaveLength(3)
	})

	it('is empty when fewer than three points survive — the fewest an area holds', () => {
		expect(
			ring([
				[2, 2],
				[28, 8],
			]),
		).toBe('')

		expect(ring([])).toBe('')

		expect(ring(SQUARE, () => null)).toBe('')
	})
})

describe('ringAnchor', () => {
	/** An open square about [5, 5] — the same ring every case below reads. */
	const RING: [number, number][] = [
		[0, 0],
		[0, 10],
		[10, 10],
		[10, 0],
	]

	it('centres on the middle of the ring', () => {
		const [anchor] = ringAnchor(RING)

		expect(anchor?.[0]).toBeCloseTo(5, 5)

		// The centre is spherical, so it sits a little poleward of the arithmetic
		// mean of the latitudes — the same reading `geoCentroid` gives a region.
		expect(anchor?.[1]).toBeCloseTo(5, 1)
	})

	it('drops the closing repeat, so one side never weighs twice', () => {
		expect(ringAnchor([...RING, RING[0] as [number, number]])).toEqual(ringAnchor(RING))
	})

	it('drops a repeat that closes to rounding rather than exactly', () => {
		// A traced ring — `circleRing`'s — lands its last position a rounding step
		// off its first. Read as a fresh vertex, it would weigh that corner twice.
		expect(ringAnchor([...RING, [4e-15, -4e-15]])).toEqual(ringAnchor(RING))
	})

	it('is empty for a ring with no points, so a caller passes it straight through', () => {
		expect(ringAnchor([])).toEqual([])
	})

	it('anchors a lone position on itself, exactly', () => {
		// It reads as its own closing repeat, so the centroid pass sees nothing and
		// the fallback returns the position untouched — no round trip to drift on.
		expect(ringAnchor([[5, 5]])).toEqual([[5, 5]])
	})

	it('stands the first vertex in where the points cancel to no centre', () => {
		// Two antipodal points leave no spherical centre; the anchor must still be
		// a position the projection can draw.
		expect(
			ringAnchor([
				[0, 0],
				[180, 0],
			]),
		).toEqual([[0, 0]])
	})
})

/**
 * An area's projection and the path strung from it. One geometry answers both,
 * so the shape a reader points at and the room `areaReach` measures are built
 * from one pass.
 */
describe('projectArea and ringsPath', () => {
	const projection = fitMapProjection('mercator', FIXTURE_GEOJSON.features, 300, 100)

	const project = (position: [number, number]) => projectPoint(projection, position)

	/** The path an area draws, in the one call the cases below read it through. */
	const areaPath = (polygons: [number, number][][][]) => ringsPath(projectArea(polygons, project))

	/** An outer ring with a hole inside it — one polygon, two rings. */
	const DONUT: [number, number][][] = [
		[
			[2, 2],
			[2, 8],
			[28, 8],
			[28, 2],
		],
		[
			[10, 4],
			[10, 6],
			[20, 6],
			[20, 4],
		],
	]

	it('draws every ring of every polygon, each closed', () => {
		const d = areaPath([DONUT])

		expect(d.match(/Z/g)).toHaveLength(2)

		expect(d.match(/M/g)).toHaveLength(2)
	})

	it('is the rings concatenated, so one ring draws exactly one closed run', () => {
		const [outer = []] = DONUT

		expect(areaPath([[outer]])).toBe(`${linePath(outer, project)}Z`)
	})

	it('draws separate parts in one string, so a split territory is one mark', () => {
		const [outer = [], hole = []] = DONUT

		expect(areaPath([[outer], [hole]])).toBe(
			`${linePath(outer, project)}Z${linePath(hole, project)}Z`,
		)
	})

	it('drops a ring the projection keeps too little of, and keeps the rest', () => {
		const [outer = []] = DONUT

		// Drops two of the hole's four positions, leaving it two — too few for an
		// area — while every position of the outer ring survives. A meridian cut
		// cannot express that: the hole sits inside the outer ring on both axes, so
		// any threshold that reaches the hole has already cut the ring around it.
		const clipped = (position: [number, number]) =>
			position[0] >= 10 && position[0] <= 20 && position[1] < 6 ? null : project(position)

		expect(ringsPath(projectArea([DONUT], clipped))).toBe(`${linePath(outer, clipped)}Z`)
	})

	it('draws nothing from no polygons', () => {
		expect(areaPath([])).toBe('')
	})

	it('bounds each ring by the points it kept', () => {
		const [outer = []] = DONUT

		const [ring] = projectArea([[outer]], project)

		const points = ring?.points ?? []

		// The box a zone rejects a far-off dot with, so it has to hold every point
		// the ring draws through and nothing wider.
		expect(ring?.box.left).toBe(Math.min(...points.map((at) => at.x)))

		expect(ring?.box.right).toBe(Math.max(...points.map((at) => at.x)))

		expect(ring?.box.top).toBe(Math.min(...points.map((at) => at.y)))

		expect(ring?.box.bottom).toBe(Math.max(...points.map((at) => at.y)))
	})
})

/**
 * The cheap reject a zone tries before anything measures: which of an area's
 * rings draw within a margin of a position. It reads the boxes `projectArea`
 * already walked, so a dot standing nowhere near a territory costs four compares
 * per ring rather than a pass over its vertices.
 */
describe('ringsNear', () => {
	/** One frame unit per degree, so a position reads straight off the coordinates. */
	const flat = (position: [number, number]) => ({ x: position[0], y: position[1] })

	/** A square of `side` units with its lower corner at `shift`. */
	const square = (side: number, shift = 0): [number, number][] => [
		[shift, 0],
		[shift, side],
		[shift + side, side],
		[shift + side, 0],
	]

	it('parts the two readings on the margin alone', () => {
		const rings = projectArea([[square(10)]], flat)

		// With none, the box is the whole question; with a reach, a position that far
		// out still counts as competing for the ring's ground.
		expect(ringsNear(rings, { x: 16, y: 5 }, 0)).toBe(false)

		expect(ringsNear(rings, { x: 16, y: 5 }, 10)).toBe(true)
	})

	it('reads every ring, so either part of a split territory answers', () => {
		const parts = projectArea([[square(10)], [square(10, 40)]], flat)

		expect(ringsNear(parts, { x: 5, y: 5 }, 0)).toBe(true)

		expect(ringsNear(parts, { x: 45, y: 5 }, 0)).toBe(true)

		// And the ground between the two clusters belongs to neither.
		expect(ringsNear(parts, { x: 25, y: 5 }, 0)).toBe(false)
	})

	it('finds nothing near a territory the projection dropped', () => {
		expect(
			ringsNear(
				projectArea([[square(10)]], () => null),
				{ x: 5, y: 5 },
				1000,
			),
		).toBe(false)
	})
})

/**
 * How much room an area holds, on the rings it draws. It is the budget a dot over
 * a zone sizes its pointer target against, so it has to measure the shape a
 * reader can point at rather than the coordinates behind it.
 */
describe('areaReach', () => {
	/** One frame unit per degree, so a reach reads straight off the coordinates. */
	const flat = (position: [number, number]) => ({ x: position[0], y: position[1] })

	/** A square of `side` units with its lower corner at the origin plus `shift`. */
	const square = (side: number, shift = 0): [number, number][] => [
		[shift, 0],
		[shift, side],
		[shift + side, side],
		[shift + side, 0],
	]

	const reachOf = (polygons: [number, number][][][]) => areaReach(projectArea(polygons, flat))

	it('reads a circle as its own radius', () => {
		// `circleRing`'s form, which most zones on a map are, and the measure is exact
		// on it: a dot at a catchment's centre has the whole radius of room around it.
		const wheel = Array.from({ length: GEOFENCE_CIRCLE_STEPS }, (_, step): [number, number] => {
			const turn = (step / GEOFENCE_CIRCLE_STEPS) * 2 * Math.PI

			return [40 * Math.cos(turn), 40 * Math.sin(turn)]
		})

		expect(reachOf([[wheel]])).toBeCloseTo(40, 0)
	})

	it('reads a square as half its side', () => {
		expect(reachOf([[square(10)]])).toBe(5)
	})

	it('reads a diagonal corridor as its width, not its diagonal', () => {
		// The case a bounding box gets wrong by an order of magnitude: the box around
		// this band is 103 units on both axes, and the band is four units across. A
		// dot on a corridor budgeted by the box would blanket the corridor.
		const band: [number, number][] = [
			[0, 0],
			[100, 100],
			[103, 97],
			[3, -3],
		]

		expect(reachOf([[band]])).toBeLessThan(5)
	})

	it('lets the widest part answer for a territory in several parts', () => {
		// Two clusters standing clear of one another, the way a dissolved coverage
		// area falls: the one a reader is looking at is the one with room in it.
		expect(reachOf([[square(10)], [square(30, 40)]])).toBe(15)
	})

	it('measures the same whichever way a ring winds', () => {
		// A dissolved territory arrives in the winding its arcs held, and no pass
		// rewinds it — so the measure may not depend on the direction.
		expect(reachOf([[square(10).reverse()]])).toBe(5)
	})

	it('measures nothing where the projection dropped every ring', () => {
		expect(areaReach(projectArea([[square(10)]], () => null))).toBe(0)
	})
})

describe('areaAnchor', () => {
	/** A small square around (0, 0) and a much wider one out at (100, 0). */
	const SMALL: [number, number][] = [
		[-1, -1],
		[-1, 1],
		[1, 1],
		[1, -1],
	]

	const WIDE: [number, number][] = [
		[90, -10],
		[90, 10],
		[110, 10],
		[110, -10],
	]

	it('stands on the largest part, never between two of them', () => {
		const [anchor] = areaAnchor([[SMALL], [WIDE]])

		// The midpoint of the two parts is around the fiftieth meridian, which is
		// ground the territory does not cover. The anchor sits on the wide part.
		expect(anchor?.[0]).toBeCloseTo(100, 0)
	})

	it('reads size the same whichever way a ring winds', () => {
		expect(areaAnchor([[SMALL], [WIDE]])).toEqual(
			areaAnchor([[[...SMALL].reverse()], [[...WIDE].reverse()]]),
		)
	})

	it('anchors on the outer ring and never inside a hole', () => {
		expect(areaAnchor([[WIDE, SMALL]])).toEqual(areaAnchor([[WIDE]]))
	})

	it('offers no stop where there is nothing to stand on', () => {
		expect(areaAnchor([])).toEqual([])

		expect(areaAnchor([[]])).toEqual([])
	})
})
