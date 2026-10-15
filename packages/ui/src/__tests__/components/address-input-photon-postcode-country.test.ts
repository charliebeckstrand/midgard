// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'

// A Photon that ignores `countrycode` can answer the code lookup with a code
// in another country. The provider must read the code only in the region.
describe('createPhotonProvider postal code country', () => {
	const SHERWOOD = {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [-122.85, 45.36] },
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

	const FOREIGN = {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [9.1, 48.7] },
		properties: {
			osm_key: 'place',
			osm_value: 'postcode',
			type: 'other',
			name: '97140',
			countrycode: 'DE',
		},
	}

	/** Answers the postal code request with `codes`, and every other request with nothing. */
	function stubPostcode(...codes: unknown[]) {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input))

			const features = url.searchParams.get('osm_tag') === 'place:postcode' ? codes : []

			return { ok: true, json: async () => ({ features }) } as Response
		})

		vi.stubGlobal('fetch', fetchMock)

		return fetchMock
	}

	function urls(fetchMock: ReturnType<typeof vi.fn>): URL[] {
		return fetchMock.mock.calls.map((call) => new URL(String(call[0])))
	}

	it('uses the match in the region, not a foreign first match', async () => {
		const fetchMock = stubPostcode(FOREIGN, SHERWOOD)

		await createPhotonProvider({ region: 'US' })('cafe 97140', {
			signal: new AbortController().signal,
		})

		const search = urls(fetchMock)[1]

		expect(search?.searchParams.get('lat')).toBe('45.36')

		expect(search?.searchParams.get('lon')).toBe('-122.85')
	})

	it('compares the country code without case', async () => {
		const fetchMock = stubPostcode({
			...SHERWOOD,
			properties: { ...SHERWOOD.properties, countrycode: 'us' },
		})

		await createPhotonProvider({ region: 'US' })('cafe 97140', {
			signal: new AbortController().signal,
		})

		expect(urls(fetchMock)[1]?.searchParams.get('lat')).toBe('45.36')
	})

	it('does not read the query as a code where the only match is foreign', async () => {
		const fetchMock = stubPostcode(FOREIGN)

		await createPhotonProvider({ region: 'US' })('cafe 97140', {
			signal: new AbortController().signal,
		})

		const search = urls(fetchMock).at(-1)

		expect(search?.searchParams.get('q')).toBe('cafe 97140')

		expect(search?.searchParams.has('lat')).toBe(false)

		expect(search?.searchParams.has('lon')).toBe(false)
	})
})
