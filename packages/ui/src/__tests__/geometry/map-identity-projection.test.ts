// @vitest-environment node
import { geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import spherical from 'us-atlas/states-10m.json'
import projected from 'us-atlas/states-albers-10m.json'
import { describe, expect, it } from 'vitest'
import {
	cachedCanonicalPaths,
	cachedChromePaths,
	cachedRegionCentroids,
	staticMapGeometry,
} from '../../modules/map/engine/map-geometry/cache'
import { EMPTY_CHROME } from '../../modules/map/engine/map-geometry/chrome'
import { mapOutline } from '../../modules/map/engine/map-outline'
import { projectionFallbackAspect } from '../../modules/map/engine/map-projection/aspect'
import { resolveProjection } from '../../modules/map/engine/map-projection/resolve'
import type { MapFeature } from '../../modules/map/engine/types'

/** The `us-atlas` states, projected by its publisher onto a 975 × 610 frame. */
const PROJECTED = projected as Parameters<typeof staticMapGeometry>[0]

/** The same states in longitude and latitude. */
const SPHERICAL = spherical as Parameters<typeof staticMapGeometry>[0]

/** The projected states as `topojson-client` decodes them, with no rewind. */
function decoded(): MapFeature[] {
	const collection = feature(projected as never, 'states') as unknown as {
		features: MapFeature[]
	}

	return collection.features
}

describe("'identity' projection", () => {
	it('resolves to a fresh instance that carries a point to itself', () => {
		const identity = resolveProjection('identity')

		expect(identity([120, 400])).toEqual([120, 400])

		expect(identity).not.toBe(resolveProjection('identity'))
	})

	it('frames the projected atlas at the ratio that albers-usa frames the spherical one', () => {
		const flat = staticMapGeometry(PROJECTED, 'states', 'identity').canonical

		const round = staticMapGeometry(SPHERICAL, 'states', 'albers-usa').canonical

		expect(flat).not.toBeNull()

		expect(round).not.toBeNull()

		// The frame height is on the grid of the region paths, so the two files
		// come to the same ratio although they are quantized apart.
		expect(flat?.aspect).toBe(round?.aspect)
	})

	it('draws from the projected buffer, the same path as the direct walk', () => {
		const geometry = staticMapGeometry(PROJECTED, 'states', 'identity')

		expect(geometry.atlas).not.toBeNull()

		const fitted = geometry.canonical?.projection

		if (fitted === undefined) throw new Error('No canonical fit')

		const path = geoPath(fitted).digits(1)

		expect(cachedCanonicalPaths(geometry)).toEqual(
			geometry.features.map((shape) => (shape.geometry === null ? null : path(shape.geometry))),
		)
	})

	it('keeps the rings as the atlas winds them', () => {
		// Frame units are not degrees, so the spherical rewind would read a y of
		// 400 as a latitude and turn rings over. The planar decode skips it.
		const { features } = staticMapGeometry(PROJECTED, 'states', 'identity')

		expect(features.map((shape) => shape.geometry)).toEqual(
			decoded().map((shape) => shape.geometry),
		)
	})

	it('centers each region on the plane, in the atlas units', () => {
		const { features } = staticMapGeometry(PROJECTED, 'states', 'identity')

		const centroids = cachedRegionCentroids(features, true)

		const planar = geoPath()

		features.forEach((shape, index) => {
			const centroid = centroids[index]

			if (shape.geometry === null || centroid == null) throw new Error(`No centroid at ${index}`)

			expect(centroid).toEqual(planar.centroid(shape.geometry))

			const [[left, top], [right, bottom]] = planar.bounds(shape.geometry)

			expect(centroid[0]).toBeGreaterThanOrEqual(left)

			expect(centroid[0]).toBeLessThanOrEqual(right)

			expect(centroid[1]).toBeGreaterThanOrEqual(top)

			expect(centroid[1]).toBeLessThanOrEqual(bottom)
		})
	})

	it('draws no graticule and no sphere', () => {
		const fitted = staticMapGeometry(PROJECTED, 'states', 'identity').canonical?.projection

		if (fitted === undefined) throw new Error('No canonical fit')

		expect(cachedChromePaths(fitted, 'identity', 10, true, { width: 1000, height: 625 })).toBe(
			EMPTY_CHROME,
		)
	})

	it('reserves no fixed ratio and has no skeleton outline', () => {
		expect(projectionFallbackAspect('identity')).toBeNull()

		expect(mapOutline('identity')).toBeNull()
	})
})
