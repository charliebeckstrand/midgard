import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapCoverage } from '../../modules/map'
import type { LngLat, MapFeature, MapFeatureCollection } from '../../modules/map/engine/types'

/**
 * A square feature, wound as RFC 7946 states it. Raw GeoJSON arrives this way,
 * so the fixtures carry the winding hazard the hook's own rewind answers.
 */
const square = (id: string, west: number, south: number, size: number): MapFeature => ({
	type: 'Feature',
	id,
	properties: { name: id },
	geometry: {
		type: 'Polygon',
		coordinates: [
			[
				[west, south],
				[west + size, south],
				[west + size, south + size],
				[west, south + size],
				[west, south],
			],
		],
	},
})

/**
 * Four counties: two in state 17, two in state 18, side by side along the
 * equator. The ids carry the `SSCCC` shape a US county atlas holds.
 */
const counties: MapFeatureCollection = {
	type: 'FeatureCollection',
	features: [
		square('17001', 0, 0, 2),
		square('17002', 2, 0, 2),
		square('18001', 4, 0, 2),
		square('18002', 6, 0, 2),
	],
}

/** One ZIP per county, each well inside the county that holds it. */
const zips: MapFeatureCollection = {
	type: 'FeatureCollection',
	features: [
		square('60601', 0.5, 0.5, 1),
		square('60602', 2.5, 0.5, 1),
		square('46001', 4.5, 0.5, 1),
		square('46002', 6.5, 0.5, 1),
	],
}

/** The hook over the fixtures, for a stated territory. */
const coverageOf = (coverage: string) =>
	renderHook(() => useMapCoverage({ coverage, zips, regions: counties })).result.current

/** Which regions a resolved frame draws. */
const framed = (geography: { features: MapFeature[] } | null) =>
	(geography?.features ?? []).map((shape) => String(shape.id))

describe('useMapCoverage', () => {
	it('frames the whole state a territory lands in, split into its counties', () => {
		const { geography, groups, codes } = coverageOf('60601')

		expect(codes).toEqual(['60601'])

		expect(groups).toEqual(['17'])

		// Both of state 17's counties, though the territory covers a code in only
		// one of them: the map is split by county and scoped to the state.
		expect(framed(geography)).toEqual(['17001', '17002'])
	})

	it('frames both states where a territory reaches across the line', () => {
		const { geography, groups } = coverageOf('60601, 46002')

		expect(groups.sort()).toEqual(['17', '18'])

		expect(framed(geography)).toEqual(['17001', '17002', '18001', '18002'])
	})

	it('reads a ZIP3 prefix as every code under it', () => {
		expect(coverageOf('606').codes).toEqual(['60601', '60602'])
	})

	it('reads a range, and takes an exception back out of it', () => {
		expect(coverageOf('46001-60602').codes).toHaveLength(4)

		expect(coverageOf('46001-60602, !46001').codes).toEqual(['60601', '60602', '46002'])
	})

	it('orders a range stated backwards, rather than reading it as empty', () => {
		expect(coverageOf('60602-46001').codes).toEqual(coverageOf('46001-60602').codes)
	})

	it('hands back the rings a geofence draws, one polygon per uncombined code', () => {
		const { area, dissolved } = coverageOf('606')

		expect(area).toHaveLength(2)

		// A feature collection cannot dissolve its shared borders away, and says so.
		expect(dissolved).toBe(false)
	})

	it('frames nothing where the territory is empty', () => {
		const { geography, area, codes } = coverageOf('')

		expect(codes).toEqual([])

		expect(area).toEqual([])

		expect(geography).toBeNull()
	})

	it('frames nothing where the territory matches no code in the atlas', () => {
		expect(coverageOf('90210').geography).toBeNull()
	})

	it('reports an unreadable term without voiding the rest of the territory', () => {
		const { codes, invalid } = coverageOf('606, chicago')

		expect(codes).toEqual(['60601', '60602'])

		expect(invalid).toEqual(['chicago'])
	})

	it('holds its result across a re-render, so the plat never refits on a repaint', () => {
		const { result, rerender } = renderHook(() =>
			useMapCoverage({ coverage: '606', zips, regions: counties }),
		)

		const first = result.current

		rerender()

		// The geography identity is what `MapPlat` keys its decode and its fit on:
		// a fresh one each render would re-project every county on every repaint.
		expect(result.current.geography).toBe(first.geography)

		expect(result.current.area).toBe(first.area)
	})

	it('holds its result when the territory is restated as a list', () => {
		const { result, rerender } = renderHook(
			({ coverage }: { coverage: string | string[] }) =>
				useMapCoverage({ coverage, zips, regions: counties }),
			{ initialProps: { coverage: '606' as string | string[] } },
		)

		const first = result.current

		// A fresh array stating the same territory: keyed on the prop's identity
		// this would re-cut the atlas on every render a caller writes inline.
		rerender({ coverage: ['606'] })

		expect(result.current.geography).toBe(first.geography)
	})

	it('draws nothing until its geography arrives, without a guard at the call site', () => {
		const { result } = renderHook(() => useMapCoverage({ coverage: '606' }))

		expect(result.current.codes).toEqual([])

		expect(result.current.geography).toBeNull()
	})

	it('takes an atlas that names its codes in a property rather than an id', () => {
		const named: MapFeatureCollection = {
			type: 'FeatureCollection',
			features: [{ ...square('', 0.5, 0.5, 1), id: undefined, properties: { ZCTA5CE20: '60601' } }],
		}

		const { result } = renderHook(() =>
			useMapCoverage({ coverage: '606', zips: named, regions: counties }),
		)

		expect(result.current.codes).toEqual(['60601'])

		expect(result.current.groups).toEqual(['17'])
	})

	it('groups by a caller rule where the ids are not FIPS codes', () => {
		const byName = (feature: MapFeature) => String(feature.properties?.name).slice(0, 2)

		const { result } = renderHook(() =>
			useMapCoverage({ coverage: '606', zips, regions: counties, regionGroup: byName }),
		)

		expect(result.current.groups).toEqual(['17'])
	})

	it('states the rings in the shape MapGeofence takes for an area', () => {
		const { area } = coverageOf('60601')

		const [polygon] = area

		const ring = polygon?.[0] as LngLat[]

		// Polygon, then ring, then position — GeoJSON MultiPolygon coordinates.
		expect(ring[0]).toEqual([0.5, 0.5])
	})
})
