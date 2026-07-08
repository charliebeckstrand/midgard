import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchOsrmRoute, fetchValhallaRoute } from '../../modules/map/map-routing'
import type { LngLat } from '../../modules/map/types'

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

function stubFetch(response: { ok: boolean; json?: unknown }) {
	const mock = vi.fn().mockResolvedValue({
		ok: response.ok,
		json: () => Promise.resolve(response.json),
	})

	vi.stubGlobal('fetch', mock)

	return mock
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('fetchOsrmRoute', () => {
	it('returns the geometry with its distance and duration', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		const result = await fetchOsrmRoute(WAYPOINTS)

		expect(result).toEqual({
			path: PAYLOAD.routes[0]?.geometry.coordinates,
			distanceMeters: 3243000,
			durationSeconds: 106200,
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
			path: WAYPOINTS,
			distanceMeters: 0,
			durationSeconds: 0,
		})
	})

	it('is null under two waypoints, without calling the network', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		expect(await fetchOsrmRoute([WAYPOINTS[0] as LngLat])).toBeNull()

		expect(mock).not.toHaveBeenCalled()
	})

	it('is null on a failed response', async () => {
		stubFetch({ ok: false })

		expect(await fetchOsrmRoute(WAYPOINTS)).toBeNull()
	})

	it('is null on an empty leg carrying neither geometry nor totals', async () => {
		stubFetch({ ok: true, json: { routes: [{}] } })

		expect(await fetchOsrmRoute(WAYPOINTS)).toBeNull()
	})

	it('keeps the totals of a false-overview leg that carries no geometry', async () => {
		// `overview: 'false'` answers with distance and duration and no line; the
		// totals must survive as an empty-path result, not be dropped to null.
		stubFetch({ ok: true, json: { routes: [{ distance: 3243000, duration: 106200 }] } })

		expect(await fetchOsrmRoute(WAYPOINTS, { overview: 'false' })).toEqual({
			path: [],
			distanceMeters: 3243000,
			durationSeconds: 106200,
		})
	})

	it('is null when the request throws', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

		expect(await fetchOsrmRoute(WAYPOINTS)).toBeNull()
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

		const result = await fetchValhallaRoute(WAYPOINTS)

		expect(result?.distanceMeters).toBe(3243000)

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
			path: [
				[0, 0],
				[2, 1],
			],
			distanceMeters: 250,
			durationSeconds: 30,
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
			path: [[0, 0]],
			distanceMeters: 250,
			durationSeconds: 30,
		})
	})

	it('maps the walking profile to pedestrian costing', async () => {
		const mock = stubFetch({ ok: true, json: PAYLOAD })

		await fetchValhallaRoute(WAYPOINTS, { profile: 'walking' })

		const [, init] = mock.mock.calls[0] as [string, RequestInit]

		expect(JSON.parse(String(init.body)).costing).toBe('pedestrian')
	})

	it('is null under two waypoints and on failure', async () => {
		stubFetch({ ok: false })

		expect(await fetchValhallaRoute([])).toBeNull()

		expect(await fetchValhallaRoute(WAYPOINTS)).toBeNull()
	})
})
