import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import {
	fitMapProjection,
	mapAutoAspect,
	mapFrameSizing,
	resolveMapProjection,
} from '../../modules/map/map-projection'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

const FEATURES = FIXTURE_GEOJSON.features

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
})
