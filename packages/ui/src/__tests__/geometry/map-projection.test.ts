// @vitest-environment node
import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { ALBERS_USA_ASPECT } from '../../modules/map/engine/map-constants'
import {
	mapFrameSizing,
	projectionFallbackAspect,
} from '../../modules/map/engine/map-projection/aspect'
import {
	canonicalFit,
	measuredMapFit,
	scaleCanonicalFit,
} from '../../modules/map/engine/map-projection/fit'
import { frameToClient } from '../../modules/map/engine/map-projection/frame'
import {
	fitMapProjection,
	resolveMapProjection,
} from '../../modules/map/engine/map-projection/resolve'
import type { MapFeature } from '../../modules/map/engine/types'
import { FLOAT } from '../helpers/geometry/tolerance'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The fit centers the geography, so the sum of two opposite edges can miss the
 * frame size by this bound in frame units.
 */
const HALF_FRAME_UNIT = 0.5

/**
 * Adaptive resampling in d3 refines each curve at the scale of its pass, so two
 * fits can differ by one percent of scale.
 */
const RESAMPLE_SCALE_RATIO = 0.01

const FEATURES = FIXTURE_GEOJSON.features

// A triangle inside the lower 48, so the US composite projection has geometry
// it can actually frame (the world fixture sits outside its insets).
const US_FEATURES = [
	{
		type: 'Feature',
		properties: { name: 'Tri-state' },
		geometry: {
			type: 'Polygon',
			coordinates: [
				[
					[-120, 34],
					[-95, 44],
					[-80, 34],
					[-120, 34],
				],
			],
		},
	},
] as unknown as MapFeature[]

describe('resolveMapProjection', () => {
	it('resolves each built-in name to a fresh projection', () => {
		for (const name of ['mercator', 'albers-usa', 'equal-earth'] as const) {
			const projection = resolveMapProjection(name)

			expect(typeof projection).toBe('function')

			expect(projection).not.toBe(resolveMapProjection(name))
		}
	})

	it('passes a d3 projection instance through untouched', () => {
		const instance = geoMercator()

		expect(resolveMapProjection(instance)).toBe(instance)
	})
})

describe('fitMapProjection', () => {
	it('fits the geography into the frame', () => {
		const projection = fitMapProjection('mercator', FEATURES, 300, 100)

		// The fixture spans lon 0–30, lat 0–10; every corner projects inside the frame.
		for (const corner of [
			[0, 0],
			[30, 0],
			[0, 10],
			[30, 10],
		] as const) {
			const point = projection([corner[0], corner[1]])

			expect(point).not.toBeNull()

			const [x, y] = point as [number, number]

			expect(x).toBeGreaterThanOrEqual(-0.01)

			expect(x).toBeLessThanOrEqual(300.01)

			expect(y).toBeGreaterThanOrEqual(-0.01)

			expect(y).toBeLessThanOrEqual(100.01)
		}
	})

	it('returns an unfitted projection when there is nothing to frame', () => {
		const projection = fitMapProjection('mercator', [], 300, 100)

		expect(typeof projection).toBe('function')
	})
})

describe('scaleCanonicalFit', () => {
	// Frames wider and narrower than the geography's own shape, so both
	// letterboxing axes are exercised.
	const frames = [
		[300, 100],
		[240, 240],
		[120, 500],
	] as const

	it.each([
		['mercator', FEATURES],
		['equal-earth', FEATURES],
		['albers-usa', US_FEATURES],
	] as const)('frames the geography like a direct fitSize under %s', (spec, features) => {
		const canonical = canonicalFit(spec, features)

		if (canonical === null) throw new Error('nothing to fit')

		const shape = { type: 'FeatureCollection', features } as const

		for (const [width, height] of frames) {
			const derived = scaleCanonicalFit(spec, canonical, width, height)

			// The geography sits inside the frame, centered, filling one axis edge
			// to edge — the fit contract itself.
			const [[x0, y0], [x1, y1]] = geoPath(derived).bounds(
				shape as unknown as Parameters<ReturnType<typeof geoPath>['bounds']>[0],
			)

			expect(x0).toBeGreaterThanOrEqual(-0.5)

			expect(y0).toBeGreaterThanOrEqual(-0.5)

			expect(x1).toBeLessThanOrEqual(width + 0.5)

			expect(y1).toBeLessThanOrEqual(height + 0.5)

			expect(Math.min(width - (x1 - x0), height - (y1 - y0))).toBeLessThan(1)

			expect(x0 + x1).toBeNear(width, HALF_FRAME_UNIT)

			expect(y0 + y1).toBeNear(height, HALF_FRAME_UNIT)

			// And it lands where a direct fitSize would, within the sub-percent
			// margin of d3's adaptive resampling, which refines each pass's curves
			// at the scale that pass runs at.
			const direct = fitMapProjection(spec, features, width, height)

			expect(derived.scale() / direct.scale()).toBeNear(1, RESAMPLE_SCALE_RATIO)
		}
	})

	it('leaves the cached canonical projection untouched', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const scale = canonical.projection.scale()

		const translate = canonical.projection.translate()

		scaleCanonicalFit('mercator', canonical, 300, 100)

		expect(canonical.projection.scale()).toBe(scale)

		expect(canonical.projection.translate()).toEqual(translate)
	})
})

describe('measuredMapFit', () => {
	it('derives a named-projection fit matching a direct fitSize', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const fit = measuredMapFit('mercator', canonical, 300, 100)

		if (fit === null) throw new Error('expected a fit')

		const direct = fitMapProjection('mercator', FEATURES, 300, 100)

		expect(fit.frame).toBeNull()

		expect(fit.projection.scale() / direct.scale()).toBeNear(1, RESAMPLE_SCALE_RATIO)
	})

	it('is null when there is nothing to frame', () => {
		// Empty geography leaves the canonical fit null; a lone-point atlas whose
		// bounds collapse does too. Either way there is no measured fit to derive,
		// so overlays never project through an unfitted default.
		expect(measuredMapFit('mercator', null, 300, 100)).toBeNull()
	})

	it('is null before the frame is measured', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		expect(measuredMapFit('mercator', canonical, 0, 100)).toBeNull()

		expect(measuredMapFit('mercator', canonical, 300, 0)).toBeNull()
	})

	it('keeps the canonical fit of a passed instance, and frames it per box', () => {
		const instance = geoMercator()

		const canonical = canonicalFit(instance, FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const scale = instance.scale()

		const translate = instance.translate()

		const small = measuredMapFit(instance, canonical, 150, 50)

		const large = measuredMapFit(instance, canonical, 600, 200)

		if (small?.frame == null || large?.frame == null) throw new Error('expected a framed fit')

		// The instance belongs to the consumer, and a refit in place would give both
		// fits one identity. Each box takes its own frame over the canonical fit.
		expect(instance.scale()).toBe(scale)

		expect(instance.translate()).toEqual(translate)

		expect(small.projection).toBe(canonical.projection)

		expect(large.frame.k / small.frame.k).toBeNear(4, FLOAT)
	})

	it('puts a passed instance where a named projection puts the same geography', () => {
		const named = canonicalFit('mercator', FEATURES)

		const passed = canonicalFit(geoMercator(), FEATURES)

		if (named === null || passed === null) throw new Error('nothing to fit')

		const a = measuredMapFit('mercator', named, 300, 160)

		const b = measuredMapFit(passed.projection, passed, 300, 160)

		if (a === null || b?.frame == null) throw new Error('expected a fit')

		const at: [number, number] = [10, 5]

		const [ax, ay] = a.projection(at) ?? [Number.NaN, Number.NaN]

		const [bx, by] = b.projection(at) ?? [Number.NaN, Number.NaN]

		expect(bx * b.frame.k + b.frame.x).toBeNear(ax, FLOAT)

		expect(by * b.frame.k + b.frame.y).toBeNear(ay, FLOAT)
	})
})

describe('canonicalFit · the reserved aspect', () => {
	it('measures the projected width / height ratio', () => {
		const aspect = canonicalFit('mercator', FEATURES)?.aspect

		// 30° wide by 10° tall near the equator: roughly 3:1 under mercator.
		expect(aspect).toBeGreaterThan(2.5)

		expect(aspect).toBeLessThan(3.5)
	})

	it('is null with no features to measure', () => {
		expect(canonicalFit('mercator', [])).toBeNull()
	})
})

describe('projectionFallbackAspect', () => {
	it('reserves the US ratio for albers-usa before its geography loads', () => {
		expect(projectionFallbackAspect('albers-usa')).toBe(ALBERS_USA_ASPECT)
	})

	it('has none for the world projections', () => {
		expect(projectionFallbackAspect('mercator')).toBeNull()

		expect(projectionFallbackAspect('equal-earth')).toBeNull()
	})
})

describe('mapFrameSizing', () => {
	it('lets an explicit height win as a fixed pixel box', () => {
		expect(mapFrameSizing(250, 'auto', 3)).toEqual({ mode: 'fixed', height: 250 })
	})

	it("derives the geography's own ratio under 'auto'", () => {
		expect(mapFrameSizing(undefined, 'auto', 3)).toEqual({ mode: 'aspect', ratio: 3 })
	})

	it("falls back to a wide frame when 'auto' has nothing to measure", () => {
		expect(mapFrameSizing(undefined, 'auto', null)).toEqual({ mode: 'aspect', ratio: 16 / 9 })
	})

	it('parses a "w/h" ratio string', () => {
		expect(mapFrameSizing(undefined, '4/3', null)).toEqual({ mode: 'aspect', ratio: 4 / 3 })
	})

	it("fills the container only when free-form — 'auto' never falls through", () => {
		expect(mapFrameSizing(undefined, false, 3)).toEqual({ mode: 'fill' })
	})

	it('rejects a negative "w/h" ratio, filling rather than reserving a negative box', () => {
		// The `${number}/${number}` type admits a signed numerator, so a negative
		// ratio must fall through to fill, not produce an invalid CSS aspect-ratio.
		expect(mapFrameSizing(undefined, '-4/3', null)).toEqual({ mode: 'fill' })
	})
})

describe('frameToClient', () => {
	const box = { left: 100, top: 50, width: 400, height: 200 }

	it('maps a frame point through a box the view frame fills exactly', () => {
		// Measured state: the viewBox matches the box, so the scale is 1 and only
		// the box's own offset applies.
		expect(frameToClient({ x: 10, y: 20 }, box, 400, 200)).toEqual({ x: 110, y: 70 })
	})

	it('scales when the view frame is a different size than the box', () => {
		expect(frameToClient({ x: 100, y: 50 }, box, 800, 400)).toEqual({ x: 150, y: 75 })
	})

	it('centers the letterbox, the SVG default preserveAspectRatio', () => {
		// Canonical state: a 400x100 view frame inside a 400x200 box fits at scale
		// 1 and centers, leaving 50px of gap above it.
		expect(frameToClient({ x: 0, y: 0 }, box, 400, 100)).toEqual({ x: 100, y: 100 })

		// A frame narrower than the box fits on its height (scale 1, not 4) and
		// centers horizontally, leaving 150px of gap either side.
		expect(frameToClient({ x: 0, y: 0 }, box, 100, 200)).toEqual({ x: 250, y: 50 })
	})

	it('reports nothing for a box or a view frame with no area', () => {
		expect(frameToClient({ x: 0, y: 0 }, { ...box, width: 0 }, 400, 200)).toBeNull()

		expect(frameToClient({ x: 0, y: 0 }, box, 0, 200)).toBeNull()

		expect(frameToClient({ x: 0, y: 0 }, box, 400, 0)).toBeNull()
	})
})
