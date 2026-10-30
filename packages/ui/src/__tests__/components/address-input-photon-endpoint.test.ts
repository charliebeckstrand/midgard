// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPhotonProvider } from '../../components/address-input'
import { requested, requestedUrls, stubEmptyFetch } from '../helpers/photon'

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

		const urls = requestedUrls(fetchMock)

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
