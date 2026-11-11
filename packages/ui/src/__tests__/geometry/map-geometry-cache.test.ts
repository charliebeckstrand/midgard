// @vitest-environment node
import { geoMercator } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import type { LngLat } from '../../modules/map'
import {
	buildStaticGeometry,
	cachedCanonicalPaths,
	cachedChromePaths,
	getStaticGeometry,
} from '../../modules/map/engine/map-geometry/cache'
import { measuredMapFit } from '../../modules/map/engine/map-projection/fit'
import { FIXTURE_GEOJSON, FIXTURE_TOPOLOGY } from '../helpers/map-geography'

describe('getStaticGeometry', () => {
	it('decodes, fits, and draws the canonical geometry', () => {
		const geometry = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		expect(geometry.features.map((entry) => entry.id)).toEqual(['A', 'B', 'C'])

		expect(geometry.canonical).not.toBeNull()

		const paths = cachedCanonicalPaths(geometry)

		expect(paths).toHaveLength(3)

		for (const d of paths) expect(d).toMatch(/^M/)
	})

	it('matches the uncached pipeline value for value', () => {
		const cached = getStaticGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		const direct = buildStaticGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		expect(cachedCanonicalPaths(cached)).toEqual(cachedCanonicalPaths(direct))

		expect(cached.canonical?.aspect).toBe(direct.canonical?.aspect)

		expect(cached.canonical?.width).toBe(direct.canonical?.width)

		expect(cached.canonical?.height).toBe(direct.canonical?.height)
	})

	it('returns the same instance for a repeat atlas + object + projection', () => {
		const first = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		const second = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		expect(second).toBe(first)

		expect(second.features).toBe(first.features)

		expect(cachedCanonicalPaths(second)).toBe(cachedCanonicalPaths(first))
	})

	it('keys the cache on the projection', () => {
		const mercator = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const albers = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'albers-usa')

		expect(albers).not.toBe(mercator)
	})

	it('keys the cache on the topology object name', () => {
		const first = getStaticGeometry(FIXTURE_TOPOLOGY, 'states', 'mercator')

		const unknown = getStaticGeometry(FIXTURE_TOPOLOGY, 'counties', 'mercator')

		// 'states' is the only real object; 'counties' decodes to nothing.
		expect(first.features).toHaveLength(3)

		expect(unknown.features).toHaveLength(0)

		expect(unknown).not.toBe(first)
	})

	it('keeps an undefined object name distinct from an explicit empty string', () => {
		const fromDefault = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const fromEmpty = getStaticGeometry(FIXTURE_TOPOLOGY, '', 'mercator')

		// `undefined` decodes the topology's first object; `''` names no object and
		// decodes nothing: the key must not fold the two together.
		expect(fromDefault.features).toHaveLength(3)

		expect(fromEmpty.features).toHaveLength(0)

		expect(fromEmpty).not.toBe(fromDefault)

		// Each still matches its own uncached computation.
		expect(cachedCanonicalPaths(fromEmpty)).toEqual(
			cachedCanonicalPaths(buildStaticGeometry(FIXTURE_TOPOLOGY, '', 'mercator')),
		)
	})

	it('leaves the shared canonical projection as it was after a measured chrome pass', () => {
		const geometry = getStaticGeometry(FIXTURE_GEOJSON, undefined, 'mercator')

		const { canonical } = geometry

		if (canonical === null) throw new Error('nothing to fit')

		const probe: LngLat = [5, 5]

		const before = canonical.projection(probe)

		const precision = canonical.projection.precision()

		const paths = cachedCanonicalPaths(geometry).slice()

		// Each plat on this atlas and each SSR request reads this one projection,
		// at each box. The measured stage draws the chrome through it, and changes
		// its curve tolerance for that pass. The pass must put the tolerance back.
		const frame = measuredMapFit(canonical, 640, 400)

		if (frame === null) throw new Error('expected a fit')

		const view = { width: 640, height: 400 }

		expect(
			cachedChromePaths(canonical.projection, 'mercator', 10, true, view, frame).graticule,
		).not.toBeNull()

		expect(canonical.projection.precision()).toBe(precision)

		expect(canonical.projection(probe)).toEqual(before)

		expect(cachedCanonicalPaths(geometry)).toEqual(paths)
	})

	it('misses for a distinct atlas object of the same shape', () => {
		const clone = structuredClone(FIXTURE_TOPOLOGY)

		const original = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, 'mercator')

		const cloned = getStaticGeometry(clone, undefined, 'mercator')

		// Same values, different identity: the WeakMap keys on the atlas object.
		expect(cloned).not.toBe(original)

		expect(cachedCanonicalPaths(cloned)).toEqual(cachedCanonicalPaths(original))
	})

	it('bypasses the cache for a passed d3 projection instance', () => {
		const projection = geoMercator()

		const first = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, projection)

		const second = getStaticGeometry(FIXTURE_TOPOLOGY, undefined, projection)

		// A mutable instance can't key a shared entry: computed fresh each call.
		expect(second).not.toBe(first)

		expect(cachedCanonicalPaths(second)).toEqual(cachedCanonicalPaths(first))
	})

	it('yields the empty geometry for absent geography', () => {
		const empty = getStaticGeometry(null, undefined, 'albers-usa')

		expect(empty.features).toEqual([])

		expect(empty.canonical).toBeNull()

		expect(cachedCanonicalPaths(empty)).toEqual([])
	})
})
