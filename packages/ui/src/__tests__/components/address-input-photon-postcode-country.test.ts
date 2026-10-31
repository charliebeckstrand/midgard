// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'
import { requestedUrls, SHERWOOD, stubPostcode } from '../helpers/photon'

// A Photon that ignores `countrycode` can answer the code lookup with a code
// in another country. The provider must read the code only in the region.
describe('createPhotonProvider postal code country', () => {
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

	it('uses the match in the region, not a foreign first match', async () => {
		const fetchMock = stubPostcode(FOREIGN, SHERWOOD)

		await createPhotonProvider({ region: 'US' })('cafe 97140', {
			signal: new AbortController().signal,
		})

		const search = requestedUrls(fetchMock)[1]

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

		expect(requestedUrls(fetchMock)[1]?.searchParams.get('lat')).toBe('45.36')
	})

	it('does not read the query as a code where the only match is foreign', async () => {
		const fetchMock = stubPostcode(FOREIGN)

		await createPhotonProvider({ region: 'US' })('cafe 97140', {
			signal: new AbortController().signal,
		})

		const search = requestedUrls(fetchMock).at(-1)

		expect(search?.searchParams.get('q')).toBe('cafe 97140')

		expect(search?.searchParams.has('lat')).toBe(false)

		expect(search?.searchParams.has('lon')).toBe(false)
	})
})
