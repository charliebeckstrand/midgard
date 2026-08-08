import { describe, expect, it } from 'vitest'
import { rewindFeatures } from '../../modules/map/engine/map-geometry/winding'
import { defaultZipId, zipArea } from '../../modules/map/engine/map-zip/dissolve'
import {
	coverageGroups,
	defaultRegionGroup,
	groupFrame,
} from '../../modules/map/engine/map-zip/frame'
import { regionAt, regionIndex } from '../../modules/map/engine/map-zip/locate'
import {
	type MapZipSelection,
	parseZipSelection,
	zipMatcher,
} from '../../modules/map/engine/map-zip/selection'
import type { LngLat, MapFeature, MapFeatureCollection } from '../../modules/map/engine/types'

/** The test a territory compiles to, in one call. */
const matcher = (selection: MapZipSelection) => zipMatcher(parseZipSelection(selection))

/** Which of a run of codes a territory holds. */
const held = (selection: MapZipSelection, codes: string[]) => codes.filter(matcher(selection))

/**
 * A grid of unit-square codes as one topology, sharing every interior edge —
 * which is what makes the dissolve below a real test rather than a concatenation.
 * Codes run left to right, then bottom to top, from `first`.
 */
function gridTopology(columns: number, rows: number, first: number) {
	const horizontal = (x: number, y: number) => y * columns + x

	const vertical = (x: number, y: number) => columns * (rows + 1) + y * (columns + 1) + x

	const arcs: LngLat[][] = []

	for (let y = 0; y <= rows; y++) {
		for (let x = 0; x < columns; x++)
			arcs[horizontal(x, y)] = [
				[x, y],
				[x + 1, y],
			]
	}

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x <= columns; x++)
			arcs[vertical(x, y)] = [
				[x, y],
				[x, y + 1],
			]
	}

	const geometries = []

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < columns; x++) {
			geometries.push({
				type: 'Polygon',
				// Counterclockwise: along the bottom, up the right, back along the top,
				// down the left — d3's own exterior winding.
				arcs: [[horizontal(x, y), vertical(x + 1, y), ~horizontal(x, y + 1), ~vertical(x, y)]],
				id: String(first + y * columns + x),
			})
		}
	}

	return {
		type: 'Topology' as const,
		objects: { zips: { type: 'GeometryCollection', geometries } },
		arcs,
	}
}

/**
 * A square feature, wound as RFC 7946 states it — counterclockwise — which is
 * the winding opposite to the one d3 reads. Raw GeoJSON arrives this way, so the
 * fixtures below carry the hazard the module's rewind pass exists for.
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

describe('parseZipSelection', () => {
	it('reads a whole code, a prefix, and a range', () => {
		expect(parseZipSelection('60601, 606, 60610-60620')).toEqual({
			include: [
				{ kind: 'code', code: '60601' },
				{ kind: 'prefix', prefix: '606' },
				{ kind: 'range', from: '60610', to: '60620' },
			],
			exclude: [],
			invalid: [],
		})
	})

	it('reads a ZIP+4 as the code it names, so a masked field pastes in', () => {
		expect(parseZipSelection('60601-1234').include).toEqual([{ kind: 'code', code: '60601' }])
	})

	it('takes a term back out where it leads with !', () => {
		const { include, exclude } = parseZipSelection('606, !60605')

		expect(include).toEqual([{ kind: 'prefix', prefix: '606' }])

		expect(exclude).toEqual([{ kind: 'code', code: '60605' }])
	})

	it('orders a range stated backwards rather than refusing it', () => {
		expect(parseZipSelection('60640-60601').include).toEqual([
			{ kind: 'range', from: '60601', to: '60640' },
		])
	})

	it('separates on commas, semicolons, and space, and closes up a spaced hyphen', () => {
		expect(parseZipSelection('606; 610  60620 - 60630').include).toEqual([
			{ kind: 'prefix', prefix: '606' },
			{ kind: 'prefix', prefix: '610' },
			{ kind: 'range', from: '60620', to: '60630' },
		])
	})

	it('collects an unreadable term and keeps the rest of the territory', () => {
		const { include, invalid } = parseZipSelection('606, chicago, 60640')

		expect(include).toHaveLength(2)

		expect(invalid).toEqual(['chicago'])
	})

	it('joins a list into the territory one string states', () => {
		expect(parseZipSelection(['606', '60640-60649'])).toEqual(parseZipSelection('606, 60640-60649'))
	})
})

describe('zipMatcher', () => {
	it('holds a whole code and nothing beside it', () => {
		expect(held('60601', ['60600', '60601', '60602'])).toEqual(['60601'])
	})

	it('holds every code under a prefix — the ZIP3 a broker states a region by', () => {
		expect(held('606', ['60599', '60600', '60650', '60699', '60700'])).toEqual([
			'60600',
			'60650',
			'60699',
		])
	})

	it('holds a range at both of its ends', () => {
		expect(held('60610-60620', ['60609', '60610', '60615', '60620', '60621'])).toEqual([
			'60610',
			'60615',
			'60620',
		])
	})

	it('subtracts an exception from the prefix that holds it', () => {
		expect(held('606, !60605', ['60604', '60605', '60606'])).toEqual(['60604', '60606'])
	})

	it('subtracts a whole range from a prefix', () => {
		expect(held('606, !60610-60620', ['60609', '60615', '60621'])).toEqual(['60609', '60621'])
	})

	it('holds nothing where the territory states only exceptions', () => {
		expect(held('!606', ['60601', '60700'])).toEqual([])
	})

	it('holds nothing where the territory is empty, rather than everything', () => {
		expect(held('', ['60601', '90210'])).toEqual([])
	})

	it('keeps a leading zero, so an Agawam code is not a four-digit number', () => {
		expect(held('010', ['01001', '01002', '10010'])).toEqual(['01001', '01002'])
	})

	it('reads a code out of a ZIP+4 or a stated address line', () => {
		const matches = matcher('606')

		expect(matches('60601-1234')).toBe(true)

		expect(matches('IL 60601')).toBe(true)

		expect(matches('6060')).toBe(false)
	})

	it('reads a range between two prefixes, the ZIP3 span a whole region is stated by', () => {
		expect(held('600-609', ['59999', '60000', '60555', '60999', '61000'])).toEqual([
			'60000',
			'60555',
			'60999',
		])
	})

	it('reads a range between two widths, widening each end the way it means', () => {
		// `606` opens at 60600 and `61` closes at 61999, so the span runs between
		// the low end of the first and the high end of the second.
		expect(held('606-61', ['60599', '60600', '61999', '62000'])).toEqual(['60600', '61999'])
	})

	it('still holds every code where two stated ranges overlap', () => {
		expect(held('60601-60610, 60605-60620', ['60600', '60603', '60612', '60621'])).toEqual([
			'60603',
			'60612',
		])
	})
})

describe('zipArea over a topology', () => {
	const topology = gridTopology(3, 3, 60600)

	/** Every code the 3x3 grid holds, in atlas order. */
	const codes = Array.from({ length: 9 }, (_, step) => String(60600 + step))

	it('dissolves the seam between two neighbours into one ring', () => {
		const area = zipArea(topology, undefined, matcher('60600, 60601'))

		expect(area.polygons).toHaveLength(1)

		expect(area.dissolved).toBe(true)

		// Two unit squares side by side, merged: the shared edge is gone, so the
		// ring is the 2x1 rectangle's own corners and not two squares' worth.
		expect(area.polygons[0]).toHaveLength(1)

		expect(new Set((area.polygons[0]?.[0] ?? []).map(String)).size).toBe(6)
	})

	it('leaves two separate clusters as two parts', () => {
		const area = zipArea(topology, undefined, matcher('60600, 60608'))

		expect(area.polygons).toHaveLength(2)
	})

	it('cuts an uncovered code inside the territory out as a hole', () => {
		const area = zipArea(topology, undefined, matcher('606, !60604'))

		expect(area.polygons).toHaveLength(1)

		// One polygon, two rings: the outer boundary and the hole the middle code
		// leaves. This is the reading `MapGeofence` fills under the even-odd rule.
		expect(area.polygons[0]).toHaveLength(2)
	})

	it('reports the matched codes in the atlas order', () => {
		expect(zipArea(topology, undefined, matcher('60600, 60602, 60601')).codes).toEqual([
			'60600',
			'60601',
			'60602',
		])
	})

	it('decodes one feature per matched code, for the pass that places them', () => {
		const area = zipArea(topology, undefined, matcher('606'))

		expect(area.features.map((shape) => String(shape.id))).toEqual(codes)
	})

	it('draws nothing where the territory matches no code in the atlas', () => {
		const area = zipArea(topology, undefined, matcher('90210'))

		expect(area).toEqual({ codes: [], features: [], polygons: [], dissolved: false })
	})

	it('draws nothing where there is no geography yet', () => {
		expect(zipArea(null, undefined, matcher('606')).codes).toEqual([])
	})
})

describe('zipArea over a feature collection', () => {
	const collection: MapFeatureCollection = {
		type: 'FeatureCollection',
		features: [square('60601', 0, 0, 1), square('60602', 1, 0, 1), square('60700', 5, 5, 1)],
	}

	it('gathers each matched code and reports that it did not dissolve', () => {
		const area = zipArea(collection, undefined, matcher('606'))

		expect(area.codes).toEqual(['60601', '60602'])

		expect(area.dissolved).toBe(false)

		// One polygon per code: the shared edge between them survives, which is the
		// difference a topology buys.
		expect(area.polygons).toHaveLength(2)
	})

	it('hands back the features as the source wound them, for the placement to wind', () => {
		// Rewinding measures a spherical area per ring, and the placement pass
		// measures almost no codes — so it winds the few it has to and this stays a
		// filter.
		const [placed] = zipArea(collection, undefined, matcher('60601')).features

		expect(placed?.geometry).toBe(collection.features[0]?.geometry)
	})

	it('draws the rings as given, which the even-odd fill needs no rewind for', () => {
		const area = zipArea(collection, undefined, matcher('60601'))

		expect(area.polygons[0]?.[0]?.[1]).toEqual([1, 0])
	})
})

describe('defaultZipId', () => {
	it('takes the id first', () => {
		expect(defaultZipId({ id: '60601', properties: { ZCTA5CE20: '99999' } })).toBe('60601')
	})

	it('falls to the Census code property, in either vintage', () => {
		expect(defaultZipId({ properties: { ZCTA5CE20: '60601' } })).toBe('60601')

		expect(defaultZipId({ properties: { ZCTA5CE10: '60602' } })).toBe('60602')
	})

	it('names nothing where the shape carries no code', () => {
		expect(defaultZipId({ properties: { name: 'Chicago' } })).toBe('')
	})
})

describe('regionAt', () => {
	const regions = rewindFeatures([square('17031', 0, 0, 2), square('18000', 4, 0, 2)])

	const index = regionIndex(regions)

	it('finds the region a position lands in', () => {
		expect(regionAt(index, regions, [1, 1])).toBe(0)

		expect(regionAt(index, regions, [5, 1])).toBe(1)
	})

	it('names no region where a position lands between them', () => {
		expect(regionAt(index, regions, [3, 1])).toBe(-1)
	})

	it('finds a region narrower than a grid cell that straddles the line between two', () => {
		// Cook County is the real case: 0.74 degrees wide, and across the meridian
		// the grid divides on. Bucketed by its own width it would claim one cell and
		// go missing from the other half of its own ground.
		const straddling = rewindFeatures([square('17031', 0.6, 0.6, 0.8)])

		const grid = regionIndex(straddling)

		expect(regionAt(grid, straddling, [0.8, 0.8])).toBe(0)

		expect(regionAt(grid, straddling, [1.2, 1.2])).toBe(0)
	})

	it('still finds a region too wide for the grid to bucket', () => {
		// A region spanning every longitude — what an antimeridian-crossing shape
		// reads as under the conservative bounds walk. It goes in the oversized
		// list, which every lookup tests after its own cell misses.
		const wide = rewindFeatures([square('02000', -180, 50, 100)])

		expect(regionAt(regionIndex(wide), wide, [-150, 60])).toBe(0)

		expect(regionAt(regionIndex(wide), wide, [-150, 20])).toBe(-1)
	})
})

describe('coverage framing', () => {
	// Two counties in state 17, one in state 18 — the id shape a US county atlas
	// carries, which `defaultRegionGroup` reads the state off.
	// Rewound the way `useMapCoverage` rewinds its region atlas, since d3 reads a
	// backwards ring as everything outside it and would place every code at once.
	const regions = rewindFeatures([
		square('17001', 0, 0, 2),
		square('17002', 2, 0, 2),
		square('18001', 4, 0, 2),
	])

	const index = regionIndex(regions)

	it('reads the state off a county id', () => {
		expect(defaultRegionGroup(square('17031', 0, 0, 1))).toBe('17')
	})

	it('names the group a covered code lands in', () => {
		const covered = rewindFeatures([square('60601', 0.2, 0.2, 0.4)])

		expect([...coverageGroups(regions, index, covered, defaultRegionGroup)]).toEqual(['17'])
	})

	it('places a code stated in either winding, so raw GeoJSON needs no pass first', () => {
		// The pass winds what it measures. A code settled on its box is never
		// measured at all, so both windings have to reach the same group either way.
		const raw = [square('60601', 0.2, 0.2, 0.4)]

		expect([...coverageGroups(regions, index, raw, defaultRegionGroup)]).toEqual(['17'])
	})

	it('places a code on its box where no region holds its centroid', () => {
		// A ring around ground the regions leave out — a lakefront code whose middle
		// is open water. The centroid names no region, and the box still names one.
		const ringed: MapFeature = {
			type: 'Feature',
			id: '60611',
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[2.6, 0.2],
						[2.6, 1.8],
						[3.8, 1.8],
						[3.8, 0.2],
						[2.6, 0.2],
					],
				],
			},
		}

		// The code sits between the two states' counties, which stop at longitude 4
		// and resume there; its own box meets state 17's counties alone.
		expect([...coverageGroups(regions, index, [ringed], defaultRegionGroup)]).toEqual(['17'])
	})

	it('places nothing for a code with no coordinates at all', () => {
		const empty: MapFeature = { type: 'Feature', id: '00000', geometry: null }

		expect([...coverageGroups(regions, index, [empty], defaultRegionGroup)]).toEqual([])
	})

	it('names both groups where a territory crosses the line between them', () => {
		const covered = rewindFeatures([square('60601', 0.2, 0.2, 0.4), square('46001', 4.2, 0.2, 0.4)])

		expect([...coverageGroups(regions, index, covered, defaultRegionGroup)].sort()).toEqual([
			'17',
			'18',
		])
	})

	it('keeps every region of a named group, not only the ones a code touched', () => {
		const frame = groupFrame(regions, new Set(['17']), defaultRegionGroup)

		// Both of state 17's counties, so the map draws the whole state split by
		// county — the second county holds no covered code and still draws.
		expect(frame?.features.map((shape) => String(shape.id))).toEqual(['17001', '17002'])
	})

	it('frames nothing where the territory placed nowhere', () => {
		expect(groupFrame(regions, new Set(), defaultRegionGroup)).toBeNull()
	})
})
