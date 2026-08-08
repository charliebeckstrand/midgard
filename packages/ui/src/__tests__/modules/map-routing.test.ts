import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchOsrmRoute } from '../../modules/map/engine/map-routing/osrm'
import { fetchValhallaRoute } from '../../modules/map/engine/map-routing/valhalla'
import type { LngLat } from '../../modules/map/engine/types'

const WAYPOINTS: LngLat[] = [
	[-118.24, 34.05],
	[-87.63, 41.88],
]

const PAYLOAD = {
	routes: [
		{
			geometry: {
				coordinates: [
					[-118.24, 34.05],
					[-104.99, 39.74],
					[-87.63, 41.88],
				],
			},
			distance: 3243000,
			duration: 106200,
		},
	],
}

function stubFetch(response: { ok: boolean; status?: number; json?: unknown }) {
	const mock = vi.fn().mockResolvedValue({
		ok: response.ok,
		status: response.status ?? (response.ok ? 200 : 500),
		json: () => Promise.resolve(response.json),
	})

	vi.stubGlobal('fetch', mock)

	return mock
}

/** A response whose body reaches the reader and then fails to parse. */
function stubUnparseableBody() {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
		}),
	)
}

/** A request that throws rather than answering — an abort, a timeout, or a dead network. */
function stubThrownRequest(error: unknown) {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('fetchOsrmRoute', () => {
	it('returns the geometry with its distance and duration', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		const answer = await fetchOsrmRoute(WAYPOINTS)

		expect(answer).toEqual({
			ok: true,
			route: {
				path: PAYLOAD.routes[0]?.geometry.coordinates,
				distanceMeters: 3243000,
				durationSeconds: 106200,
			},
		})

		const url = String(mock.mock.calls[0]?.[0])

		expect(url).toContain('/route/v1/driving/-118.24,34.05;-87.63,41.88')

		expect(url).toContain('geometries=geojson')
	})

	it('zeroes missing totals rather than dropping the geometry', async () => {
		stubFetch({
			ok: true,
			json: { routes: [{ geometry: { coordinates: WAYPOINTS } }] },
		})

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: true,
			route: { path: WAYPOINTS, distanceMeters: 0, durationSeconds: 0 },
		})
	})

	it('fails as waypoints under two stops, without calling the network', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		expect(await fetchOsrmRoute([WAYPOINTS[0] as LngLat])).toEqual({
			ok: false,
			failure: { kind: 'waypoints', retryable: false },
		})

		expect(mock).not.toHaveBeenCalled()
	})

	it('keeps the totals of a false-overview leg that carries no geometry', async () => {
		// `overview: 'false'` answers with distance and duration and no line; the
		// totals must survive as an empty-path result, not be dropped to a failure.
		stubFetch({ ok: true, json: { routes: [{ distance: 3243000, duration: 106200 }] } })

		expect(await fetchOsrmRoute(WAYPOINTS, { overview: 'false' })).toEqual({
			ok: true,
			route: { path: [], distanceMeters: 3243000, durationSeconds: 106200 },
		})
	})

	it('carries a refused status, and retries only what can clear', async () => {
		// The demo server's own answer under load: a 504 and a 429 are worth asking
		// again, while a 400 is the same request refused the same way every time.
		stubFetch({ ok: false, status: 504 })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'http', status: 504, retryable: true },
		})

		stubFetch({ ok: false, status: 429 })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'http', status: 429, retryable: true },
		})

		stubFetch({ ok: false, status: 400 })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'http', status: 400, retryable: false },
		})
	})

	it('tells a timeout from the caller`s own abort', async () => {
		// Both arrive as a rejected fetch and only the reason's name separates them:
		// a timeout can clear on another request, while the caller ended its own.
		stubThrownRequest(new DOMException('The operation timed out', 'TimeoutError'))

		expect(await fetchOsrmRoute(WAYPOINTS, { timeoutMs: 5000 })).toEqual({
			ok: false,
			failure: { kind: 'timeout', retryable: true },
		})

		stubThrownRequest(new DOMException('The operation was aborted', 'AbortError'))

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'aborted', retryable: false },
		})
	})

	it('reads any other thrown request as a dead network', async () => {
		stubThrownRequest(new TypeError('Failed to fetch'))

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'network', retryable: true },
		})
	})

	it('reads a body that is no routing answer as a payload failure', async () => {
		stubUnparseableBody()

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'payload', retryable: false },
		})

		// Parsed, and still not an answer: a body naming neither a leg nor a
		// refusal, and a leg carrying neither geometry nor a total.
		stubFetch({ ok: true, json: {} })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'payload', retryable: false },
		})

		stubFetch({ ok: true, json: { routes: [{}] } })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'payload', retryable: false },
		})
	})

	it('reads the service`s own refusal as no-route, carrying its code', async () => {
		// OSRM refuses a pair it cannot join under a 200, in its own code and with
		// no `routes` at all — the dead end a retry can never clear.
		stubFetch({
			ok: true,
			json: { code: 'NoRoute', message: 'Impossible route between points' },
		})

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'no-route', retryable: false, code: 'NoRoute' },
		})

		// An empty `routes` array says the same thing without naming it.
		stubFetch({ ok: true, json: { code: 'Ok', routes: [] } })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'no-route', retryable: false },
		})
	})

	it('honours a custom base URL and profile', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		await fetchOsrmRoute(WAYPOINTS, { baseUrl: 'https://osrm.internal', profile: 'cycling' })

		expect(String(mock.mock.calls[0]?.[0])).toContain('https://osrm.internal/route/v1/cycling/')
	})

	it('defaults overview to simplified and threads an overview override into the url', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		await fetchOsrmRoute(WAYPOINTS)

		expect(String(mock.mock.calls[0]?.[0])).toContain('overview=simplified')

		await fetchOsrmRoute(WAYPOINTS, { overview: 'full' })

		expect(String(mock.mock.calls[1]?.[0])).toContain('overview=full')
	})

	it('hands fetch an abort signal only when a timeout is set', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		await fetchOsrmRoute(WAYPOINTS)

		expect((mock.mock.calls[0]?.[1] as RequestInit | undefined)?.signal).toBeUndefined()

		await fetchOsrmRoute(WAYPOINTS, { timeoutMs: 5000 })

		expect((mock.mock.calls[1]?.[1] as RequestInit | undefined)?.signal).toBeInstanceOf(AbortSignal)
	})
})

describe('fetchValhallaRoute', () => {
	it('POSTs OSRM-format locations and parses the same payload shape', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		const answer = await fetchValhallaRoute(WAYPOINTS)

		expect(answer.ok && answer.route.distanceMeters).toBe(3243000)

		const [url, init] = mock.mock.calls[0] as [string, RequestInit]

		expect(url).toContain('/route?format=osrm')

		expect(JSON.parse(String(init.body))).toMatchObject({
			costing: 'auto',
			directions_type: 'none',
			shape_format: 'polyline6',
			locations: [
				{ lat: 34.05, lon: -118.24 },
				{ lat: 41.88, lon: -87.63 },
			],
		})
	})

	it('decodes a polyline6 shape string into lon/lat coordinates', async () => {
		// A precision-6 polyline for the lat/lng points (0, 0) then (1, 2); the
		// codec stores lat before lng, so a correct decode yields the swapped
		// [lon, lat] pairs [0, 0] and [2, 1] — an lng/lat transposition would
		// surface here as [1, 2].
		stubFetch({
			ok: true,
			json: { routes: [{ geometry: '??_c`|@_gayB', distance: 250, duration: 30 }] },
		})

		expect(await fetchValhallaRoute(WAYPOINTS)).toEqual({
			ok: true,
			route: {
				path: [
					[0, 0],
					[2, 1],
				],
				distanceMeters: 250,
				durationSeconds: 30,
			},
		})
	})

	it('drops a truncated trailing point instead of emitting a garbage coordinate', async () => {
		// The full shape decodes to [[0,0],[2,1]]; dropping the last char truncates
		// the second point's varint, so the partial pair is dropped rather than
		// pushed as a coordinate built from a zeroed delta.
		stubFetch({
			ok: true,
			json: { routes: [{ geometry: '??_c`|@_gay', distance: 250, duration: 30 }] },
		})

		expect(await fetchValhallaRoute(WAYPOINTS)).toEqual({
			ok: true,
			route: { path: [[0, 0]], distanceMeters: 250, durationSeconds: 30 },
		})
	})

	it('maps the walking profile to pedestrian costing', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		await fetchValhallaRoute(WAYPOINTS, { profile: 'walking' })

		const [, init] = mock.mock.calls[0] as [string, RequestInit]

		expect(JSON.parse(String(init.body)).costing).toBe('pedestrian')
	})

	it('names its failures on the taxonomy both clients share', async () => {
		stubFetch({ ok: false, status: 503 })

		expect(await fetchValhallaRoute([])).toEqual({
			ok: false,
			failure: { kind: 'waypoints', retryable: false },
		})

		expect(await fetchValhallaRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'http', status: 503, retryable: true },
		})
	})
})
