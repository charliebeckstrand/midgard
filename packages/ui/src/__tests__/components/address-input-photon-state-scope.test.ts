// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'
import { OREGON, type PhotonFetch, place, requestedUrls, stubState } from '../helpers/photon'

/** Photon gives Alaska an extent from -180 to 180, because the state crosses the antimeridian. */
const ALASKA = {
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [-152.28, 64.45] },
	properties: {
		osm_id: 1116270,
		osm_type: 'R',
		type: 'state',
		name: 'Alaska',
		extent: [-180, 71.589, 180, 51.007],
	},
}

function scopedUrl(fetchMock: PhotonFetch) {
	return requestedUrls(fetchMock).find(
		(url) =>
			url.searchParams.get('layer') !== 'state' &&
			(url.searchParams.has('bbox') || url.searchParams.has('lat')),
	)
}

const signal = new AbortController().signal

describe('createPhotonProvider: the search inside a US state', () => {
	it('asks for four times the limit, removes the matches outside the state, then keeps the limit', async () => {
		const fetchMock = stubState(
			OREGON,
			[
				place('Starbucks Vancouver', 'Washington'),
				place('Starbucks Boise', 'Idaho'),
				place('Starbucks Portland', 'Oregon'),
				place('Starbucks Salem', 'OR'),
				place('Starbucks Bend', 'Oregon'),
			],
			[place('Starbucks Fresno', 'California')],
		)

		const results = await createPhotonProvider({ region: 'US', limit: 2 })('starbucks Oregon', {
			signal,
		})

		expect(results.map((result) => result.label)).toEqual(['Starbucks Portland', 'Starbucks Salem'])

		expect(scopedUrl(fetchMock)?.searchParams.get('limit')).toBe('8')
	})

	it('sends no box for an extent that spans the globe, and searches near the point of the state', async () => {
		const fetchMock = stubState(
			ALASKA,
			[
				place('Starbucks London', 'England'),
				place('Starbucks Anchorage', 'Alaska'),
				place('Starbucks Juneau', 'AK'),
			],
			[place('Starbucks Seattle', 'Washington')],
		)

		const results = await createPhotonProvider({ region: 'US' })('starbucks Alaska', { signal })

		expect(results.map((result) => result.label)).toEqual([
			'Starbucks Anchorage',
			'Starbucks Juneau',
		])

		const urls = requestedUrls(fetchMock)

		expect(urls.some((url) => url.searchParams.has('bbox'))).toBe(false)

		const scoped = scopedUrl(fetchMock)

		expect(scoped?.searchParams.get('q')).toBe('starbucks')

		expect(scoped?.searchParams.get('lat')).toBe('64.45')

		expect(scoped?.searchParams.get('lon')).toBe('-152.28')
	})

	it('sends the box of a state whose extent does not span the globe', async () => {
		const fetchMock = stubState(OREGON, [place('Starbucks Portland', 'Oregon')], [])

		await createPhotonProvider({ region: 'US' })('starbucks Oregon', { signal })

		const scoped = scopedUrl(fetchMock)

		expect(scoped?.searchParams.get('bbox')).toBe('-124.7,41.99,-116.46,46.29')

		expect(scoped?.searchParams.has('lat')).toBe(false)
	})
})
