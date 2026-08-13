import { type GeoProjection, geoMercator } from 'd3-geo'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import type { MapFeature, MapTopology } from '../../modules/map'
import {
	affineBasis,
	areaOnly,
	emitRegionPaths,
	type MapProjectedAtlas,
	projectAtlas,
} from '../../modules/map/engine/map-geometry/projected'
import { regionPaths } from '../../modules/map/engine/map-geometry/region'
import { geographyFeatures } from '../../modules/map/engine/map-geometry/topology'
import { rewindFeatures } from '../../modules/map/engine/map-geometry/winding'
import { canonicalFit, scaleCanonicalFit } from '../../modules/map/engine/map-projection/fit'
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
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

/**
 * The buffer for a geography, or a failure naming the fixture rather than a
 * `null` the assertions would then have to narrow away at every site.
 */
function projected(features: MapFeature[], projection: GeoProjection): MapProjectedAtlas {
	const atlas = projectAtlas(features, projection)

	if (atlas === null) throw new Error('projectAtlas declined the fixture')

	return atlas
}

describe('projectAtlas + emitRegionPaths', () => {
	it('emits the canonical fit byte for byte', () => {
		expect(
			emitRegionPaths(projected(stateFeatures, canonical.projection), canonical.projection),
		).toEqual(regionPaths(stateFeatures, canonical.projection))
	})

	it('emits a measured refit byte for byte, from the canonical buffer', () => {
		// The pass the change exists for: the buffer is drawn once under the
		// canonical fit and read again under the measured one, which
		// `scaleCanonicalFit` derives from it by the same arithmetic the emit
		// applies. Several boxes, because one could agree by coincidence of scale,
		// and one of them far above the canonical frame — a real atlas carries
		// vertices enough that the resampling below never shows on it.
		const atlas = projected(stateFeatures, canonical.projection)

		for (const [width, height] of [
			[800, 450],
			[317, 211],
			[16_000, 10_000],
		] as const) {
			const measured = scaleCanonicalFit('albers-usa', canonical, width, height)

			expect(emitRegionPaths(atlas, measured)).toEqual(regionPaths(stateFeatures, measured))
		}
	})

	it('freezes the resampling of the fit it was drawn at', () => {
		// `geoPath` refines a curve until its chord sits within a tolerance measured
		// in frame units, so the buffer holds the vertices its own fit earned and a
		// distant frame would have earned others. Nothing on a drawn atlas reaches
		// that — the case above proves `states-10m` matches from a third of its
		// canonical width to sixteen times it, being a quantised topology whose own
		// vertices already sit inside the tolerance — so the bound is pinned on
		// geography sparse enough to show it: four corners spanning the lower 48,
		// every edge a long arc under the composite.
		const quad = [
			feature({
				type: 'Polygon',
				coordinates: [
					[
						[-120, 30],
						[-120, 48],
						[-75, 48],
						[-75, 30],
						[-120, 30],
					],
				],
			}),
		]

		const fit = canonicalFit('albers-usa', quad)

		if (fit === null) throw new Error('fixture yielded no fit')

		const atlas = projected(quad, fit.projection)

		// Near the frame it was drawn at, both fits refine the edges alike.
		for (const [width, height] of [
			[400, 250],
			[800, 500],
		] as const) {
			const measured = scaleCanonicalFit('albers-usa', fit, width, height)

			expect(emitRegionPaths(atlas, measured)).toEqual(regionPaths(quad, measured))
		}

		// Far above it, the walk earns vertices along an arc this still draws as
		// the chord the canonical frame accepted.
		const wide = scaleCanonicalFit('albers-usa', fit, 16_000, 10_000)

		const emitted = emitRegionPaths(atlas, wide)

		const walked = regionPaths(quad, wide)

		expect(emitted).not.toEqual(walked)

		// The parting is vertex density, not placement: every point this emits is
		// one the walk also drew. The ring's close rides the last of them, so it
		// comes off before the two sets are compared.
		const points = (d: string | null) =>
			(d ?? '').split(/(?=[ML])/).map((point) => point.replace(/Z$/, ''))

		const emittedPoints = points(emitted?.[0] ?? null)

		const walkedPoints = points(walked[0] ?? null)

		expect(emittedPoints.length).toBeLessThan(walkedPoints.length)

		expect(walkedPoints).toEqual(expect.arrayContaining(emittedPoints))
	})

	it('refuses a fit the affine does not place its witness at', () => {
		// The claim the emit rests on, held by a test rather than by a comment: a
		// projection whose parameters moved by anything but a scale and a
		// translation must be refused, not drawn from. A rotation leaves `scale`
		// and `translate` readable and plausible, and moves every coordinate.
		const atlas = projected(FIXTURE_GEOJSON.features, geoMercator())

		const rotated = geoMercator().rotate([40, 0])

		expect(emitRegionPaths(atlas, rotated)).toBeNull()
	})

	it('emits byte for byte across two direct fits of one passed projection', () => {
		// The escape-hatch path: a consumer's own d3 instance, which `fitMapProjection`
		// fits in place rather than deriving by arithmetic, so its two fits reach the
		// emit through d3's own `fitSize` and not through `scaleCanonicalFit`. On the
		// atlas rather than the fixture squares, whose four-vertex edges straddle a
		// resampling threshold between the two boxes and would measure the bound
		// above instead of this path.
		const instance = geoMercator()

		const atlas = projected(stateFeatures, fitMapProjection(instance, stateFeatures, 640, 480))

		const refit = fitMapProjection(instance, stateFeatures, 300, 200)

		expect(emitRegionPaths(atlas, refit)).toEqual(regionPaths(stateFeatures, refit))
	})

	it('holds index alignment across features that draw nothing', () => {
		const features = [
			feature(null),
			...FIXTURE_GEOJSON.features,
			feature({ type: 'Polygon', coordinates: [] }),
		]

		const projection = geoMercator().scale(200).translate([100, 100])

		const emitted = emitRegionPaths(projected(features, projection), projection)

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
		expect(emitRegionPaths(projected(FIXTURE_GEOJSON.features, geoMercator()), clipped)).toBeNull()
	})

	it('reports a basis for every built-in projection', () => {
		// `albers-usa` carries no `clipExtent` method at all, and the other two
		// default to none — the property the refusal above is the exception to.
		expect(affineBasis(canonical.projection)).not.toBeNull()

		expect(affineBasis(geoMercator())).not.toBeNull()
	})
})
