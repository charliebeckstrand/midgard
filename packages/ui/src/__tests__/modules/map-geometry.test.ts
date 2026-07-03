import { describe, expect, it } from 'vitest'
import {
	geographyFeatures,
	linePath,
	projectPoint,
	regionPaths,
} from '../../modules/map/map-geometry'
import { fitMapProjection } from '../../modules/map/map-projection'
import { FIXTURE_GEOJSON, FIXTURE_TOPOLOGY } from '../helpers/map-geography'

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
