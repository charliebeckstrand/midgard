import { geoMercator } from 'd3-geo'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import type { MapFeature, MapTopology } from '../../modules/map'
import {
	affineBasis,
	areaOnly,
	emitRegionPaths,
	projectAtlas,
} from '../../modules/map/engine/map-geometry/projected'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { geographyFeatures } from '../../modules/map/engine/map-geometry/topology'
import { rewindFeatures } from '../../modules/map/engine/map-geometry/winding'
import { canonicalFit, scaleCanonicalFit } from '../../modules/map/engine/map-projection/fit'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The buffer stands in for the projection walk, so the whole of it rests on the
 * strings coming back identical to the ones that walk would have written. The
 * fixture geography cannot show that: three unit squares under `mercator` never
 * reach a hole, a multipolygon, or the composite's insets. So the identity cases
 * draw `states-10m` under `albers-usa` — the atlas the benchmarks measure and
 * the demos draw — where an island state carries several rings, Alaska and
 * Hawaii route to sub-projections of their own, and each inset clips.
 */

const statesTopology = states as unknown as MapTopology

const stateFeatures = rewindFeatures(geographyFeatures(statesTopology))

const canonical = canonicalFit('albers-usa', stateFeatures)

if (canonical === null) throw new Error('fixture atlas yielded no fit')

/** A feature carrying `geometry`, with the identity fields the drawing never reads. */
function feature(geometry: MapFeature['geometry']): MapFeature {
	return { type: 'Feature', geometry }
}

describe('projectAtlas + emitRegionPaths', () => {
	it('emits the canonical fit byte for byte', () => {
		const atlas = projectAtlas(stateFeatures, canonical.projection)

		expect(atlas).not.toBeNull()

		expect(emitRegionPaths(atlas as NonNullable<typeof atlas>, canonical.projection)).toEqual(
			regionPaths(stateFeatures, canonical.projection),
		)
	})

	it('emits a measured refit byte for byte, from the canonical buffer', () => {
		// The pass the change exists for: the buffer is drawn once under the
		// canonical fit and read again under the measured one, which
		// `scaleCanonicalFit` derives from it by the same arithmetic the emit
		// applies. Two boxes, because one could agree by coincidence of scale.
		const atlas = projectAtlas(stateFeatures, canonical.projection)

		expect(atlas).not.toBeNull()

		for (const [width, height] of [
			[800, 450],
			[317, 211],
		] as const) {
			const measured = scaleCanonicalFit('albers-usa', canonical, width, height)

			expect(emitRegionPaths(atlas as NonNullable<typeof atlas>, measured)).toEqual(
				regionPaths(stateFeatures, measured),
			)
		}
	})

	it('holds index alignment across features that draw nothing', () => {
		const features = [
			feature(null),
			...FIXTURE_GEOJSON.features,
			feature({ type: 'Polygon', coordinates: [] }),
		]

		const projection = geoMercator().scale(200).translate([100, 100])

		const atlas = projectAtlas(features, projection)

		expect(atlas).not.toBeNull()

		const emitted = emitRegionPaths(atlas as NonNullable<typeof atlas>, projection)

		expect(emitted).toEqual(regionPaths(features, projection))

		expect(emitted).toHaveLength(features.length)

		expect(emitted?.[0]).toBeNull()

		expect(emitted?.at(-1)).toBeNull()
	})

	it('declines geography the emit cannot redraw', () => {
		const projection = geoMercator()

		for (const geometry of [
			{ type: 'Point', coordinates: [0, 0] },
			{
				type: 'LineString',
				coordinates: [
					[0, 0],
					[1, 1],
				],
			},
			{ type: 'GeometryCollection', geometries: [] },
		] as MapFeature['geometry'][]) {
			const features = [...FIXTURE_GEOJSON.features, feature(geometry)]

			expect(areaOnly(features)).toBe(false)

			expect(projectAtlas(features, projection)).toBeNull()
		}
	})

	it('declines a projection whose clip extent would cut a different map at each fit', () => {
		const clipped = geoMercator().clipExtent([
			[0, 0],
			[100, 100],
		])

		expect(affineBasis(clipped)).toBeNull()

		expect(projectAtlas(FIXTURE_GEOJSON.features, clipped)).toBeNull()

		// The same refusal from the other side: a buffer drawn without a clip
		// cannot be read through a fit that gained one.
		const atlas = projectAtlas(FIXTURE_GEOJSON.features, geoMercator())

		expect(atlas).not.toBeNull()

		expect(emitRegionPaths(atlas as NonNullable<typeof atlas>, clipped)).toBeNull()
	})

	it('reports a basis for every built-in projection', () => {
		// `albers-usa` carries no `clipExtent` method at all, and the other two
		// default to none — the property the refusal above is the exception to.
		expect(affineBasis(canonical.projection)).not.toBeNull()

		expect(affineBasis(geoMercator())).not.toBeNull()
	})
})
