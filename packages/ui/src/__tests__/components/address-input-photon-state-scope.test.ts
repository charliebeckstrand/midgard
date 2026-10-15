// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'

const OREGON = {
	type: 'Feature',
	geometry: { type: 'Point', coordinates: [-120.5, 44] },
	properties: {
		osm_id: 165476,
		osm_type: 'R',
		type: 'state',
		name: 'Oregon',
		extent: [-124.7, 46.29, -116.46, 41.99],
	},
}

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

function place(name: string, state: string) {
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [-122.6, 45.5] },
		properties: { osm_id: name.length + state.length, osm_type: 'N', name, state },
	}
}

/**
 * Answers the state lookup with `area`, the search scoped to the state (by a
 * box or by a point) with `scoped`, and the query as typed with `typed`. The
 * provider has no bias, so only the scoped search carries `lat`.
 */
function stubState(area: unknown, scoped: unknown[], typed: unknown[]) {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const url = new URL(String(input))

		const features =
			url.searchParams.get('layer') === 'state'
				? [area]
				: url.searchParams.has('bbox') || url.searchParams.has('lat')
					? scoped
					: typed

		return { ok: true, json: async () => ({ features }) } as Response
	})

	vi.stubGlobal('fetch', fetchMock)

	return fetchMock
}

function scopedUrl(fetchMock: ReturnType<typeof stubState>) {
	return fetchMock.mock.calls
		.map((call) => new URL(String(call[0])))
		.find(
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

		const urls = fetchMock.mock.calls.map((call) => new URL(String(call[0])))

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
