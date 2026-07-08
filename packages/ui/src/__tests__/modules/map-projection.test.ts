import { geoMercator, geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { ALBERS_USA_ASPECT } from '../../modules/map/map-constants'
import {
	canonicalFit,
	fitMapProjection,
	mapAutoAspect,
	mapFrameSizing,
	measuredMapFit,
	projectionFallbackAspect,
	resolveMapProjection,
	scaleCanonicalFit,
} from '../../modules/map/map-projection'
import type { MapFeature } from '../../modules/map/types'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

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

			// The geography sits inside the frame, centred, filling one axis edge
			// to edge — the fit contract itself.
			const [[x0, y0], [x1, y1]] = geoPath(derived).bounds(
				shape as unknown as Parameters<ReturnType<typeof geoPath>['bounds']>[0],
			)

			expect(x0).toBeGreaterThanOrEqual(-0.5)

			expect(y0).toBeGreaterThanOrEqual(-0.5)

			expect(x1).toBeLessThanOrEqual(width + 0.5)

			expect(y1).toBeLessThanOrEqual(height + 0.5)

			expect(Math.min(width - (x1 - x0), height - (y1 - y0))).toBeLessThan(1)

			expect(x0 + x1).toBeCloseTo(width, 0)

			expect(y0 + y1).toBeCloseTo(height, 0)

			// And it lands where a direct fitSize would, within the sub-percent
			// margin of d3's adaptive resampling — fitSize measures bounds at its
			// probe scale, the canonical fit at drawing scale.
			const direct = fitMapProjection(spec, features, width, height)

			expect(Math.abs(derived.scale() / direct.scale() - 1)).toBeLessThan(0.01)
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

		const fit = measuredMapFit('mercator', FEATURES, canonical, 300, 100)

		if (fit === null) throw new Error('expected a fit')

		const direct = fitMapProjection('mercator', FEATURES, 300, 100)

		expect(Math.abs(fit.scale() / direct.scale() - 1)).toBeLessThan(0.01)
	})

	it('is null when there is nothing to frame', () => {
		// Empty geography leaves the canonical fit null; a lone-point atlas whose
		// bounds collapse does too. Either way there is no measured fit to derive,
		// so overlays never project through an unfitted default.
		expect(measuredMapFit('mercator', [], null, 300, 100)).toBeNull()
	})

	it('is null before the frame is measured', () => {
		const canonical = canonicalFit('mercator', FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		expect(measuredMapFit('mercator', FEATURES, canonical, 0, 100)).toBeNull()

		expect(measuredMapFit('mercator', FEATURES, canonical, 300, 0)).toBeNull()
	})

	it('refits a passed instance to each frame, so a resize reprojects', () => {
		const instance = geoMercator()

		const canonical = canonicalFit(instance, FEATURES)

		if (canonical === null) throw new Error('nothing to fit')

		const small = measuredMapFit(instance, FEATURES, canonical, 150, 50)

		if (small === null) throw new Error('expected a fit')

		const smallScale = small.scale()

		const large = measuredMapFit(instance, FEATURES, canonical, 600, 200)

		if (large === null) throw new Error('expected a fit')

		// The 4×-wider frame fits the same geography at ~4× the scale — the instance
		// is refit in place rather than frozen at the first frame's fit.
		expect(large.scale() / smallScale).toBeCloseTo(4, 0)
	})
})

describe('mapAutoAspect', () => {
	it('measures the projected width / height ratio', () => {
		const aspect = mapAutoAspect('mercator', FEATURES)

		// 30° wide by 10° tall near the equator: roughly 3:1 under mercator.
		expect(aspect).toBeGreaterThan(2.5)

		expect(aspect).toBeLessThan(3.5)
	})

	it('is null with no features to measure', () => {
		expect(mapAutoAspect('mercator', [])).toBeNull()
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
