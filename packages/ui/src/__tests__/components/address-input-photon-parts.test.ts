// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPhotonProvider } from '../../components/address-input/address-input-photon'

function makeFeature(
	properties: Record<string, unknown>,
	coordinates: [number, number] = [10, 20],
) {
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates },
		properties,
	}
}

/** Answers each Photon request with these features. */
function stubFeatures(...features: ReturnType<typeof makeFeature>[]) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({ ok: true, json: async () => ({ features }) }) as Response),
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('createPhotonProvider address parts', () => {
	it('fills the street of a road match from its name, and keeps the name', async () => {
		stubFeatures(
			makeFeature({
				osm_id: 1,
				osm_type: 'W',
				osm_key: 'highway',
				osm_value: 'residential',
				type: 'street',
				name: 'Main Street',
				city: 'Newberg',
				state: 'Oregon',
				country: 'United States',
			}),
		)

		const provider = createPhotonProvider({ region: 'DE' })

		const [result] = await provider('Main Street', { signal: new AbortController().signal })

		expect(result?.address?.street).toBe('Main Street')

		expect(result?.name).toBe('Main Street')

		expect(result?.label).toBe('Main Street')

		expect(result?.description).toBe('Newberg, Oregon, United States')
	})

	it('fills the code of a postcode match from its name, and leaves the name unset', async () => {
		stubFeatures(
			makeFeature({
				osm_key: 'place',
				osm_value: 'postcode',
				type: 'other',
				name: '97140',
				countrycode: 'US',
				state: 'Oregon',
				country: 'United States',
			}),
		)

		const provider = createPhotonProvider({ region: 'US' })

		const [result] = await provider('97140', { signal: new AbortController().signal })

		expect(result?.address?.postcode).toBe('97140')

		expect(result?.name).toBeUndefined()

		expect(result?.label).toContain('97140')
	})
})
