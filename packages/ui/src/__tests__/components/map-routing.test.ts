import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOsrmRoute, fetchValhallaRoute } from '../../components/map/routing'
import type { LngLat } from '../../components/map/types'

const TWO_POINTS: LngLat[] = [
	[-122.4, 37.78],
	[-73.98, 40.75],
]

const ROUTE_COORDS: LngLat[] = [
	[-122.4, 37.78],
	[-100, 39],
	[-73.98, 40.75],
]

const ROUTE_JSON = {
	routes: [{ geometry: { coordinates: ROUTE_COORDS } }],
}

function jsonResponse(body: unknown, init: Partial<{ ok: boolean; status: number }> = {}) {
	return {
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: async () => body,
	} as unknown as Response
}

function throwingJsonResponse() {
	return {
		ok: true,
		status: 200,
		json: async () => {
			throw new SyntaxError('Unexpected token')
		},
	} as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

function nthCall(index: number): [string, RequestInit | undefined] {
	const call = fetchMock.mock.calls[index]
	if (!call) throw new Error(`expected fetch to have been called at least ${index + 1} time(s)`)
	return call as [string, RequestInit | undefined]
}

beforeEach(() => {
	fetchMock = vi.fn()
	vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('fetchOsrmRoute', () => {
	it('returns null without calling fetch when given fewer than 2 waypoints', async () => {
		expect(await fetchOsrmRoute([])).toBeNull()
		expect(await fetchOsrmRoute([[0, 0]])).toBeNull()

		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('returns the first route geometry on a successful response', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		const result = await fetchOsrmRoute(TWO_POINTS)

		expect(result).toEqual(ROUTE_COORDS)
	})

	it('builds the default OSRM url with driving profile and semicolon-joined lon,lat coords', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchOsrmRoute(TWO_POINTS)

		const [url, init] = nthCall(0)

		expect(url).toBe(
			'https://router.project-osrm.org/route/v1/driving/-122.4,37.78;-73.98,40.75?overview=full&geometries=geojson',
		)
		expect(init).toEqual({ signal: undefined })
	})

	it('honors custom baseUrl and profile', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchOsrmRoute(TWO_POINTS, {
			baseUrl: 'https://osrm.example.com',
			profile: 'cycling',
		})

		const [url] = nthCall(0)

		expect(url).toBe(
			'https://osrm.example.com/route/v1/cycling/-122.4,37.78;-73.98,40.75?overview=full&geometries=geojson',
		)
	})

	it('forwards the AbortSignal to fetch', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))
		const controller = new AbortController()

		await fetchOsrmRoute(TWO_POINTS, { signal: controller.signal })

		expect(nthCall(0)[1]).toEqual({ signal: controller.signal })
	})

	it('returns null on non-2xx responses', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 504 }))

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when json() throws (malformed body)', async () => {
		fetchMock.mockResolvedValueOnce(throwingJsonResponse())

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when fetch rejects (network error or abort)', async () => {
		fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when the response has no routes', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}))

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()

		fetchMock.mockResolvedValueOnce(jsonResponse({ routes: [] }))

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()

		fetchMock.mockResolvedValueOnce(jsonResponse({ routes: [{}] }))

		expect(await fetchOsrmRoute(TWO_POINTS)).toBeNull()
	})
})

describe('fetchValhallaRoute', () => {
	it('returns null without calling fetch when given fewer than 2 waypoints', async () => {
		expect(await fetchValhallaRoute([])).toBeNull()
		expect(await fetchValhallaRoute([[0, 0]])).toBeNull()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('returns the first route geometry on a successful response', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		const result = await fetchValhallaRoute(TWO_POINTS)

		expect(result).toEqual(ROUTE_COORDS)
	})

	it('POSTs to the default Valhalla url with locations mapped to {lat, lon} and auto costing', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchValhallaRoute(TWO_POINTS)

		const [url, init] = nthCall(0)

		expect(url).toBe('https://valhalla1.openstreetmap.de/route?format=osrm')
		expect(init?.method).toBe('POST')
		expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
		expect(init?.signal).toBeUndefined()
		expect(JSON.parse(String(init?.body))).toEqual({
			locations: [
				{ lat: 37.78, lon: -122.4 },
				{ lat: 40.75, lon: -73.98 },
			],
			costing: 'auto',
			shape_format: 'geojson',
		})
	})

	it('maps profile to Valhalla costing: walking → pedestrian, cycling → bicycle', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchValhallaRoute(TWO_POINTS, { profile: 'walking' })

		expect(JSON.parse(String(nthCall(0)[1]?.body)).costing).toBe('pedestrian')

		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchValhallaRoute(TWO_POINTS, { profile: 'cycling' })

		expect(JSON.parse(String(nthCall(1)[1]?.body)).costing).toBe('bicycle')
	})

	it('honors custom baseUrl', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))

		await fetchValhallaRoute(TWO_POINTS, { baseUrl: 'https://valhalla.example.com' })

		expect(nthCall(0)[0]).toBe('https://valhalla.example.com/route?format=osrm')
	})

	it('forwards the AbortSignal to fetch', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(ROUTE_JSON))
		const controller = new AbortController()

		await fetchValhallaRoute(TWO_POINTS, { signal: controller.signal })

		expect(nthCall(0)[1]?.signal).toBe(controller.signal)
	})

	it('returns null on non-2xx responses', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }))

		expect(await fetchValhallaRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when json() throws (malformed body)', async () => {
		fetchMock.mockResolvedValueOnce(throwingJsonResponse())

		expect(await fetchValhallaRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when fetch rejects (network error or abort)', async () => {
		fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))

		expect(await fetchValhallaRoute(TWO_POINTS)).toBeNull()
	})

	it('returns null when the response has no routes', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ routes: [{ geometry: {} }] }))

		expect(await fetchValhallaRoute(TWO_POINTS)).toBeNull()
	})
})
