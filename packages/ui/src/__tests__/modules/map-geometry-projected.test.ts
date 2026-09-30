// @vitest-environment node
import { type GeoProjection, geoMercator } from 'd3-geo'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import type { MapFeature, MapTopology } from '../../modules/map'
import {
	affineBasis,
	areaOnly,
	carriedTransform,
	emitRegionPaths,
	type MapProjectedAtlas,
	probeCanonicalFit,
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
		// canonical width to sixteen times it, being a quantized topology whose own
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

	it('measures the same canonical frame as the fit that walks its own bounds', () => {
		// The fold replaces `canonicalFit`'s bounds pass with a scan of the points
		// the buffer already holds, so the frame it reports must be the one the
		// walk reported — a divergence here would reserve a different CSS box and
		// reflow the page a beat after mount.
		const probed = probeCanonicalFit(stateFeatures, 'albers-usa')

		expect(probed).not.toBeNull()

		expect(probed?.canonical.height).toBe(canonical.height)

		expect(probed?.canonical.aspect).toBe(canonical.aspect)
	})

	it('emits the canonical paths byte for byte from the folded walk', () => {
		// The whole of the fold rests on this: the buffer is drawn at probe scale
		// and read at the canonical fit several times its size, so a real atlas
		// must still come out identical to the walk that draws it at that fit
		// directly. `PROBE_REFINEMENT` is what holds it.
		const probed = probeCanonicalFit(stateFeatures, 'albers-usa')

		expect(probed).not.toBeNull()

		if (probed === null) return

		expect(emitRegionPaths(probed.atlas, probed.canonical.projection)).toEqual(
			regionPaths(stateFeatures, canonical.projection),
		)

		// And through a measured refit, the fit an ordinary mount settles on.
		const measured = scaleCanonicalFit('albers-usa', probed.canonical, 800, 450)

		expect(emitRegionPaths(probed.atlas, measured)).toEqual(regionPaths(stateFeatures, measured))
	})

	it('declines the fold for geography the buffer cannot hold', () => {
		// The fallback the cache reads: no buffer, so `canonicalFit` measures its
		// own bounds and the paths take the direct walk.
		expect(probeCanonicalFit([], 'albers-usa')).toBeNull()

		expect(
			probeCanonicalFit(
				[...FIXTURE_GEOJSON.features, feature({ type: 'Point', coordinates: [0, 0] })],
				'albers-usa',
			),
		).toBeNull()
	})

	it('leaves a passed projection its own precision', () => {
		// The fold refines the probe walk beyond d3's default, and a passed
		// instance belongs to the consumer — so the setting is restored, as
		// `fitProjectionWidth` restores a clip it borrowed.
		const instance = geoMercator()

		const before = instance.precision()

		probeCanonicalFit(stateFeatures, instance)

		expect(instance.precision()).toBe(before)
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

	it('writes the sign of a coordinate the fit places below zero', () => {
		// A translate that puts the first corner a fraction below zero on both axes.
		// There the integer part is zero, and only the written sign keeps it negative.
		const projection = geoMercator().scale(200).translate([-0.3, -0.7])

		const emitted = emitRegionPaths(projected(FIXTURE_GEOJSON.features, projection), projection)

		expect(emitted).toEqual(regionPaths(FIXTURE_GEOJSON.features, projection))

		expect(emitted?.[0]).toMatch(/^M-0\.3,-0\.7L/)
	})

	it('finds its witness in a multipolygon', () => {
		const parts = feature({
			type: 'MultiPolygon',
			coordinates: [
				[
					[
						[0, 0],
						[0, 5],
						[5, 5],
						[5, 0],
						[0, 0],
					],
				],
				[
					[
						[10, 0],
						[10, 5],
						[15, 5],
						[15, 0],
						[10, 0],
					],
				],
			],
		})

		const projection = geoMercator().scale(200).translate([100, 100])

		const atlas = projected([parts], projection)

		expect(atlas.witness?.position).toEqual([0, 0])

		const refit = geoMercator().scale(400).translate([50, 50])

		expect(emitRegionPaths(atlas, refit)).toEqual(regionPaths([parts], refit))
	})

	it('declines to emit where no witness can test the fit', () => {
		// Nothing drew, so nothing places a witness, and the emit cannot prove the
		// affine. The caller falls back to the direct walk.
		const projection = geoMercator()

		const atlas = projected([feature(null)], projection)

		expect(atlas.witness).toBeNull()

		expect(emitRegionPaths(atlas, projection)).toBeNull()
	})

	it('declines a buffer drawn at no scale', () => {
		const atlas = projected(FIXTURE_GEOJSON.features, geoMercator().scale(0))

		expect(emitRegionPaths(atlas, geoMercator())).toBeNull()
	})

	it('declines the fold for geography that collapses to one position', () => {
		const point = feature({
			type: 'Polygon',
			coordinates: [
				[
					[5, 5],
					[5, 5],
					[5, 5],
					[5, 5],
				],
			],
		})

		expect(probeCanonicalFit([point], 'mercator')).toBeNull()
	})

	it('reports a basis for every built-in projection', () => {
		// `albers-usa` carries no `clipExtent` method at all, and the other two
		// default to none — the property the refusal above is the exception to.
		expect(affineBasis(canonical.projection)).not.toBeNull()

		expect(affineBasis(geoMercator())).not.toBeNull()
	})
})

/**
 * The one group transform the region layer moves per refit, in place of a new
 * `d` on every path. It must put each canonical coordinate where the measured
 * fit draws it, and refuse where the buffer cannot prove that.
 */
describe('carriedTransform', () => {
	const atlas = projected(stateFeatures, canonical.projection)

	it('carries a canonical position onto the measured fit', () => {
		const measured = scaleCanonicalFit('albers-usa', canonical, 800, 450)

		const transform = carriedTransform(atlas, canonical.projection, measured)

		expect(transform).not.toBeNull()

		if (transform === null) return

		expect(transform.k).toBeCloseTo(measured.scale() / canonical.projection.scale(), 12)

		for (const position of [
			[-100, 40],
			[-75, 42],
			[-120, 35],
		] as [number, number][]) {
			const from = canonical.projection(position)

			const to = measured(position)

			if (from === null || to === null) throw new Error('fixture position has no image')

			expect(from[0] * transform.k + transform.x).toBeCloseTo(to[0], 6)

			expect(from[1] * transform.k + transform.y).toBeCloseTo(to[1], 6)
		}
	})

	it('refuses one projection refit in place, whose canonical basis is gone', () => {
		expect(carriedTransform(atlas, canonical.projection, canonical.projection)).toBeNull()
	})

	it('refuses where either fit cannot be reached from the buffer', () => {
		const fixture = projected(FIXTURE_GEOJSON.features, geoMercator())

		const clipped = geoMercator().clipExtent([
			[0, 0],
			[100, 100],
		])

		const rotated = geoMercator().rotate([40, 0])

		expect(carriedTransform(fixture, clipped, geoMercator())).toBeNull()

		expect(carriedTransform(fixture, geoMercator(), rotated)).toBeNull()
	})

	it('refuses a canonical fit scaled to nothing', () => {
		const fixture = projected(FIXTURE_GEOJSON.features, geoMercator())

		expect(carriedTransform(fixture, geoMercator().scale(0), geoMercator())).toBeNull()
	})
})
