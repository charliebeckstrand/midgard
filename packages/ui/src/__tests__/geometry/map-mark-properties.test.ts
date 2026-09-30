// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { projectPoint, unprojectPoint } from '../../modules/map/engine/map-geometry/mark'
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
import { FLOAT } from '../helpers/geometry/tolerance'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

// `map-geometry.test.ts` holds one round trip at a fixed position. The property
// below reads the pair over the globe, for each named projection that has an
// inverse at each position.
//
// `albers-usa` is not here. Its composite drops a position outside its insets,
// so it has no inverse over the globe.

/**
 * A position on the globe. Longitude stays off the antimeridian, where -180 and
 * 180 are one meridian. Latitude stays off the poles, where Mercator has no
 * image and a longitude has no meaning.
 */
const position = () =>
	fc.tuple(
		fc.integer({ min: -179_000, max: 179_000 }).map((milli) => milli / 1000),
		fc.integer({ min: -85_000, max: 85_000 }).map((milli) => milli / 1000),
	)

describe('projectPoint · properties', () => {
	test.prop([
		fc.constantFrom('mercator' as const, 'equal-earth' as const),
		position(),
		fc.integer({ min: 50, max: 1200 }),
		fc.integer({ min: 50, max: 800 }),
	])('unprojects each projected position back to itself', (name, at, width, height) => {
		const projection = fitMapProjection(name, FIXTURE_GEOJSON.features, width, height)

		const point = projectPoint(projection, at)

		if (point === null) throw new Error(`${name} must give each position an image`)

		const back = unprojectPoint(projection, point)

		expect(back?.[0]).toBeNear(at[0], FLOAT)

		expect(back?.[1]).toBeNear(at[1], FLOAT)
	})
})
