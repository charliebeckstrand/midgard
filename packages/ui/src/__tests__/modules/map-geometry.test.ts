import { geoArea } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import {
	dotPath,
	geographyFeatures,
	linePath,
	projectPoint,
	regionPaths,
	rewindFeatures,
} from '../../modules/map/map-geometry'
import { fitMapProjection } from '../../modules/map/map-projection'
import type { MapFeature } from '../../modules/map/types'
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

		const rings = (fixed?.geometry as { coordinates: number[][][] }).coordinates

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

		const rings = (fixed?.geometry as { coordinates: number[][][] }).coordinates

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

		expect((fixed?.geometry as { coordinates: number[][][] }).coordinates).toEqual([])
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

		const polygons = (fixed?.geometry as { coordinates: number[][][][] }).coordinates

		// The first polygon's mis-wound exterior is flipped; the second, already
		// correct, is left as it stands.
		expect(polygons[0]?.[0]).toEqual(CW_EXTERIOR)

		expect(polygons[1]?.[0]).toEqual(shifted)
	})

	it('leaves non-polygonal geometry alone', () => {
		const point: MapFeature = {
			type: 'Feature',
			id: 'P',
			geometry: { type: 'Point', coordinates: [5, 5] } as unknown as object,
		}

		const features = [point]

		expect(rewindFeatures(features)).toBe(features)
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
