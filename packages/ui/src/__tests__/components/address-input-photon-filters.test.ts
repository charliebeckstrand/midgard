// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'

/** The match for the postal code 97140, as Photon gives it. */
const SHERWOOD = {
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [-122.85, 45.36] },
	// A postal code carries no OSM object.
	properties: {
		osm_key: 'place',
		osm_value: 'postcode',
		type: 'other',
		name: '97140',
		city: 'Sherwood',
		state: 'Oregon',
		countrycode: 'US',
	},
}

/** Answers the postal code request with `codes`, and each other request with nothing. */
function stubPostcode(...codes: unknown[]) {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = new URL(String(input))

		const features = url.searchParams.get('osm_tag') === 'place:postcode' ? codes : []

		return { ok: true, json: async () => ({ features }) } as Response
	})

	vi.stubGlobal('fetch', fetchMock)

	return fetchMock
}

// An empty filter keeps every match, as no filter does. Thus a query that is
// only a code answers with the code, and makes no search near it.
describe('createPhotonProvider with empty filters', () => {
	it.each([
		['layers', { layers: [] }],
		['osmTag', { osmTag: [] }],
		['layers and osmTag', { layers: [], osmTag: [] }],
	])('reads an empty %s as unset', async (_, filters) => {
		const fetchMock = stubPostcode(SHERWOOD)

		const results = await createPhotonProvider({ region: 'US', ...filters })('97140', {
			signal: new AbortController().signal,
		})

		expect(fetchMock).toHaveBeenCalledTimes(1)

		expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('osm_tag')).toBe(
			'place:postcode',
		)

		expect(results).toHaveLength(1)

		expect(results[0]).toMatchObject({ id: 'place:postcode:US:97140', label: '97140' })
	})
})
