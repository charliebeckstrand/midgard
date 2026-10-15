// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'

/** A US state with a box, so that the search inside the state runs. */
const OREGON = {
	geometry: { coordinates: [-120.5, 44] },
	properties: { name: 'Oregon', extent: [-124.6, 46.3, -116.5, 41.9] },
}

/** Answers the state request with `OREGON`, and each other request with no matches. */
function stubEmptyFetch() {
	const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
		const layer = new URL(String(input), 'https://relative.test').searchParams.get('layer')

		const features = layer === 'state' ? [OREGON] : []

		return { ok: true, json: async () => ({ features }) } as Response
	})

	vi.stubGlobal('fetch', fetchMock)

	return fetchMock
}

/** Each URL that the stubbed fetch got, as it got it. */
function requested(fetchMock: ReturnType<typeof stubEmptyFetch>): string[] {
	return fetchMock.mock.calls.map((call) => String(call[0]))
}

describe('createPhotonProvider endpoint with a query string', () => {
	it('keeps the endpoint params and adds the search params', async () => {
		const fetchMock = stubEmptyFetch()

		await createPhotonProvider({ endpoint: 'https://geo.example/api?key=abc' })('diner', {
			signal: new AbortController().signal,
		})

		const url = new URL(requested(fetchMock)[0] ?? '')

		expect(url.origin + url.pathname).toBe('https://geo.example/api')

		expect(url.searchParams.get('key')).toBe('abc')

		expect(url.searchParams.get('q')).toBe('diner')

		expect(url.searchParams.get('limit')).toBe('5')
	})

	it('keeps the endpoint params on the postal code and state requests', async () => {
		const fetchMock = stubEmptyFetch()

		const provider = createPhotonProvider({
			endpoint: 'https://geo.example/api?key=abc',
			region: 'US',
		})

		await provider('ice cream 97140', { signal: new AbortController().signal })

		await provider('diner portland oregon', { signal: new AbortController().signal })

		const urls = requested(fetchMock).map((href) => new URL(href))

		expect(urls.some((url) => url.searchParams.get('osm_tag') === 'place:postcode')).toBe(true)

		expect(urls.some((url) => url.searchParams.get('layer') === 'state')).toBe(true)

		expect(urls.some((url) => url.searchParams.has('bbox'))).toBe(true)

		expect(urls.length).toBe(5)

		for (const url of urls) {
			expect(url.searchParams.get('key')).toBe('abc')

			expect(url.searchParams.get('q')).not.toBeNull()
		}
	})

	it('keeps a relative endpoint relative', async () => {
		const fetchMock = stubEmptyFetch()

		await createPhotonProvider({ endpoint: '/api/photon?key=abc' })('diner', {
			signal: new AbortController().signal,
		})

		expect(requested(fetchMock)[0]).toBe('/api/photon?key=abc&q=diner&limit=5')
	})

	it('keeps the URL of a plain endpoint as it was', async () => {
		const fetchMock = stubEmptyFetch()

		await createPhotonProvider()('diner', { signal: new AbortController().signal })

		expect(requested(fetchMock)[0]).toBe('https://photon.komoot.io/api/?q=diner&limit=5')
	})
})
