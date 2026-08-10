import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../modules/map'
import {
	cachedCanonicalPaths,
	computeStaticMapGeometry,
	staticMapGeometry,
} from '../../modules/map/engine/map-geometry/cache'
import { fitMapProjection } from '../../modules/map/engine/map-projection/resolve'
import { FIXTURE_GEOJSON, FIXTURE_TOPOLOGY } from '../helpers/map-geography'

describe('staticMapGeometry', () => {
	it('decodes, fits, and draws the canonical geometry', () => {
		const geometry = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		expect(geometry.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])

		expect(geometry.canonical).not.toBeNull()

		const paths = cachedCanonicalPaths(geometry)

		expect(paths).toHaveLength(3)

		for (const d of paths) expect(d).toMatch(/^M/)
	})

	it('matches the uncached pipeline value for value', () => {
		const cached = staticMapGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		const direct = computeStaticMapGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		expect(cachedCanonicalPaths(cached)).toEqual(cachedCanonicalPaths(direct))

		expect(cached.canonical?.aspect).toBe(direct.canonical?.aspect)

		expect(cached.canonical?.width).toBe(direct.canonical?.width)

		expect(cached.canonical?.height).toBe(direct.canonical?.height)
	})

	it('returns the same instance for a repeat atlas + object + projection', () => {
		const first = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		const second = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		expect(second).toBe(first)

		expect(second.features).toBe(first.features)

		expect(cachedCanonicalPaths(second)).toBe(cachedCanonicalPaths(first))
	})

	it('keys the cache on the projection', () => {
		const mercator = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const albers = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		expect(albers).not.toBe(mercator)
	})

	it('keys the cache on the topology object name', () => {
		const first = staticMapGeometry(FIXTURE_TOPOLOGY, 'states', 'mercator')

		const unknown = staticMapGeometry(FIXTURE_TOPOLOGY, 'counties', 'mercator')

		// 'states' is the only real object; 'counties' decodes to nothing.
		expect(first.features).toHaveLength(3)

		expect(unknown.features).toHaveLength(0)

		expect(unknown).not.toBe(first)
	})

	it('keeps an undefined object name distinct from an explicit empty string', () => {
		const fromDefault = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const fromEmpty = staticMapGeometry(FIXTURE_TOPOLOGY, '', 'mercator')

		// `undefined` decodes the topology's first object; `''` names no object and
		// decodes nothing — the key must not fold the two together.
		expect(fromDefault.features).toHaveLength(3)

		expect(fromEmpty.features).toHaveLength(0)

		expect(fromEmpty).not.toBe(fromDefault)

		// Each still matches its own uncached computation.
		expect(cachedCanonicalPaths(fromEmpty)).toEqual(
			cachedCanonicalPaths(computeStaticMapGeometry(FIXTURE_TOPOLOGY, '', 'mercator')),
		)
	})

	it('leaves the shared canonical projection unmutated under a measured refit', () => {
		const geometry = staticMapGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		const probe: LngLat = [5, 5]

		const before = geometry.canonical?.projection(probe)

		const paths = cachedCanonicalPaths(geometry).slice()

		// The per-instance measured refit MapPlat runs on mount must build a fresh
		// projection, never re-fit the shared cached one that siblings and SSR
		// requests read through.
		const measured = fitMapProjection('mercator', geometry.features, 640, 400)

		expect(measured).not.toBe(geometry.canonical?.projection)

		expect(geometry.canonical?.projection(probe)).toEqual(before)

		expect(cachedCanonicalPaths(geometry)).toEqual(paths)
	})

	it('misses for a distinct atlas object of the same shape', () => {
		const clone = structuredClone(FIXTURE_TOPOLOGY)

		const original = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const cloned = staticMapGeometry(clone, undefined, 'mercator')

		// Same values, different identity: the WeakMap keys on the atlas object.
		expect(cloned).not.toBe(original)

		expect(cachedCanonicalPaths(cloned)).toEqual(cachedCanonicalPaths(original))
	})

	it('bypasses the cache for a passed d3 projection instance', () => {
		const projection = geoMercator()

		const first = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, projection)

		const second = staticMapGeometry(FIXTURE_TOPOLOGY, undefined, projection)

		// A mutable instance can't key a shared entry — computed fresh each call.
		expect(second).not.toBe(first)

		expect(cachedCanonicalPaths(second)).toEqual(cachedCanonicalPaths(first))
	})

	it('yields the empty geometry for absent geography', () => {
		const empty = staticMapGeometry(null, undefined, 'albers-usa')

		expect(empty.features).toEqual([])

		expect(empty.canonical).toBeNull()

		expect(cachedCanonicalPaths(empty)).toEqual([])
	})
})
