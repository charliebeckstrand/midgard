// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'
import { requestedUrls, SHERWOOD, stubPostcode } from '../helpers/photon'

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

		expect(requestedUrls(fetchMock)[0]?.searchParams.get('osm_tag')).toBe('place:postcode')

		expect(results).toHaveLength(1)

		expect(results[0]).toMatchObject({ id: 'place:postcode:US:97140', label: '97140' })
	})
})
