import type { GeoGeometryObjects } from 'd3-geo'
import type { MapFeature, MapFeatureCollection, MapTopology } from 'ui/modules/map'
import states from 'us-atlas/states-10m.json'
import { describe, expect, it } from 'vitest'
import type { Place } from '../../types'
import {
	boundStates,
	centredProjection,
	decodeStates,
	groupPlacesByState,
	stateFrame,
	stateName,
} from '../../utilities/places-geography'

/**
 * A rectangle, wound the way `d3-geo` reads an exterior ring.
 *
 * The winding is the whole reason this helper exists. Wound the other way the
 * ring is its own complement on the sphere: `geoBounds` answers with the globe
 * and `geoContains` answers `true` everywhere outside it, so every case below
 * would pass for the wrong reason.
 */
function box(west: number, south: number, east: number, north: number): GeoGeometryObjects {
	return {
		type: 'Polygon',
		coordinates: [
			[
				[west, south],
				[west, north],
				[east, north],
				[east, south],
				[west, south],
			],
		],
	}
}

/** One named region over that rectangle. */
function region(name: string, geometry: GeoGeometryObjects | null): MapFeature {
	return { type: 'Feature', properties: { name }, geometry }
}

/** Oregon's rough extent, and an offshore box that crosses the antimeridian. */
const OREGON = region('Oregon', box(-124, 42, -117, 46))

const ALEUTIANS = region('Alaska', box(170, 50, -175, 55))

const ATLAS: MapFeatureCollection = { type: 'FeatureCollection', features: [OREGON, ALEUTIANS] }

/** One place at a position, with only the fields the grouping reads named. */
function place(id: string, at: [number, number], fields: Partial<Place> = {}): Place {
	return {
		id,
		name: id,
		category: 'food',
		address: 'somewhere',
		longitude: at[0],
		latitude: at[1],
		rating: 0,
		visitedAt: '2026-08-15',
		createdAt: '2026-08-15T18:00:00.000Z',
		...fields,
	}
}

describe('stateName', () => {
	it('reads the name the atlas carries', () => {
		expect(stateName(OREGON)).toBe('Oregon')
	})

	// Identity is the fallback, not the answer: us-atlas keys its states by FIPS
	// code, so a name read id-first says "41" where every other readout says
	// "Oregon".
	it('falls back to the identity where a feature carries no name', () => {
		expect(stateName({ type: 'Feature', id: 41, geometry: null })).toBe('41')
	})
})

describe('decodeStates', () => {
	it('answers with nothing for an atlas that has not landed', () => {
		expect(decodeStates(undefined)).toBeNull()
	})

	it('decodes the states out of the published topology', () => {
		const decoded = decodeStates(states as unknown as MapTopology)

		expect(decoded).not.toBeNull()

		expect(decoded?.type).toBe('FeatureCollection')

		// 50 states, the District of Columbia, and the five inhabited territories.
		expect(decoded?.features).toHaveLength(56)

		expect(decoded?.features.map(stateName)).toContain('Oregon')
	})
})

describe('stateFrame', () => {
	it('answers with the whole country where nothing is drilled', () => {
		expect(stateFrame(ATLAS, null)).toBe(ATLAS)
	})

	it('answers with the whole country where the name is not one it draws', () => {
		expect(stateFrame(ATLAS, 'Atlantis')).toBe(ATLAS)
	})

	it('cuts one state out as a collection of one', () => {
		const cut = stateFrame(ATLAS, 'Oregon')

		expect(cut?.features).toHaveLength(1)

		expect(stateName(cut?.features[0] as MapFeature)).toBe('Oregon')
	})

	it('answers with nothing before the atlas lands', () => {
		expect(stateFrame(null, 'Oregon')).toBeNull()
	})
})

describe('centredProjection', () => {
	it('answers with nothing to centre on for an empty atlas', () => {
		expect(centredProjection(null)).toBeNull()

		expect(centredProjection({ type: 'FeatureCollection', features: [] })).toBeNull()
	})

	// The rotation is what un-wraps Alaska and takes the shear off every other
	// state: the subject goes on the meridian rather than being fitted across a
	// span it does not occupy.
	it('rotates the projection onto the subject its own centroid names', () => {
		const projection = centredProjection({ type: 'FeatureCollection', features: [OREGON] })

		expect(projection).not.toBeNull()

		expect(projection?.rotate()[0]).toBeCloseTo(120.5, 0)
	})
})

describe('boundStates', () => {
	it('answers with nothing before the atlas lands', () => {
		expect(boundStates(null)).toEqual([])
	})

	it('measures a box for each state it can', () => {
		const bounded = boundStates(ATLAS)

		expect(bounded.map((held) => held.name)).toEqual(['Oregon', 'Alaska'])

		expect(bounded[0]?.bounds[0]?.[0]).toBeCloseTo(-124, 5)
	})

	it('drops a feature that carries no geometry', () => {
		const bounded = boundStates({
			type: 'FeatureCollection',
			features: [OREGON, region('Nowhere', null)],
		})

		expect(bounded).toHaveLength(1)
	})
})

describe('groupPlacesByState', () => {
	const bounded = boundStates(ATLAS)

	it('groups a place under the state whose shape holds it', () => {
		const grouped = groupPlacesByState(bounded, [place('corvallis', [-123.26, 44.56])])

		expect([...grouped.keys()]).toEqual(['Oregon'])

		expect(grouped.get('Oregon')?.map((held) => held.id)).toEqual(['corvallis'])
	})

	it('keeps several places in one state, in the order they were given', () => {
		const grouped = groupPlacesByState(bounded, [
			place('a', [-123, 45]),
			place('b', [-120, 44]),
			place('c', [-118, 43]),
		])

		expect(grouped.get('Oregon')?.map((held) => held.id)).toEqual(['a', 'b', 'c'])
	})

	// An atlas is a generalized outline, so a coastal place can sit a few hundred
	// metres outside the shape that plainly holds it. The geocoder's own name
	// answers where the geometry does not.
	it('falls back to the name the geocoder gave, for a place just off the outline', () => {
		const grouped = groupPlacesByState(bounded, [
			place('lighthouse', [-124.08, 44.63], { state: 'Oregon' }),
		])

		expect(grouped.get('Oregon')?.map((held) => held.id)).toEqual(['lighthouse'])
	})

	// The fallback is checked against the drawn states, so a name the atlas does
	// not carry resolves to nothing rather than to a state that is not on the map.
	it('drops a fallback name the atlas does not draw', () => {
		const grouped = groupPlacesByState(bounded, [
			place('paris', [2.35, 48.85], { state: 'Île-de-France' }),
		])

		expect(grouped.size).toBe(0)
	})

	it('drops a place that neither the geometry nor a name places', () => {
		const grouped = groupPlacesByState(bounded, [place('offshore', [-140, 30])])

		expect(grouped.size).toBe(0)
	})

	// A box that crosses the antimeridian comes back wrapped — west 170, east
	// -175 — so the longitude test has to read the two sides as an outside. Read
	// as a plain range it rejects every point in the state.
	it('holds a place on either side of the antimeridian', () => {
		const grouped = groupPlacesByState(bounded, [
			place('east', [178, 52]),
			place('west', [-178, 52]),
		])

		expect(grouped.get('Alaska')?.map((held) => held.id)).toEqual(['east', 'west'])
	})

	it('answers with nothing for no places', () => {
		expect(groupPlacesByState(bounded, []).size).toBe(0)
	})
})
