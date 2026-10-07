import { describe, expect, it } from 'vitest'
import { atlasBounded, atlasNames, atlasRegions } from '../../utilities/places-atlas'
import { regionName } from '../../utilities/places-geography'

describe('places atlas', () => {
	// The palette lists the names off the topology, and the map draws the decoded
	// regions. The two must agree, also on Antarctica, which no map here draws.
	it.each(['states', 'countries'] as const)('names each drawn region of the %s', (atlas) => {
		expect(atlasNames(atlas)).toEqual(atlasRegions(atlas).features.map(regionName))
	})

	it('draws no Antarctica', () => {
		expect(atlasNames('countries')).not.toContain('Antarctica')
	})

	it('decodes and measures each atlas once', () => {
		expect(atlasRegions('countries')).toBe(atlasRegions('countries'))

		expect(atlasBounded('states')).toBe(atlasBounded('states'))
	})
})
