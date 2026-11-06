// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { thrownFailure } from '../../modules/map/engine/map-routing/failure'
import { fetchOsrmRoute } from '../../modules/map/engine/map-routing/osrm'
import { requestSignal } from '../../modules/map/engine/map-routing/request'
import { refusedFailure } from '../../modules/map/engine/map-routing/result'
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

/** A request that throws rather than answering: a dead network. */
function stubThrownRequest(error: unknown) {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
}

/**
 * A request that stays open until its signal fires, and then rejects with that
 * signal's reason, as `fetch` does.
 */
function stubPendingRequest() {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			(_url: string, init: RequestInit) =>
				new Promise((_resolve, reject) => {
					init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
				}),
		),
	)
}

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

	// The demo server's own answer under load: a 504 and a 429 are worth asking
	// again, while a 400 is the same request refused the same way every time.
	it.for([
		{ status: 504, retryable: true },
		{ status: 429, retryable: true },
		{ status: 400, retryable: false },
	])(
		'carries a refused status, and retries only what can clear: $status',
		async ({ status, retryable }) => {
			stubFetch({ ok: false, status })

			expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
				ok: false,
				failure: { kind: 'http', status, retryable },
			})
		},
	)

	// Both arrive as a rejected fetch, and only the signal that fired separates
	// them: a timeout can clear on another request, while the caller ended its own.
	it('fails as a timeout where the timeout it set fires', async () => {
		stubPendingRequest()

		expect(await fetchOsrmRoute(WAYPOINTS, { timeoutMs: 1 })).toEqual({
			ok: false,
			failure: { kind: 'timeout', retryable: true },
		})
	})

	// A caller can abort with any reason, and `fetch` rejects with that reason, so
	// a reason that is no `AbortError` must still read as the caller's own abort.
	it.for([
		{ name: 'the default reason', reason: undefined },
		{ name: 'a string reason', reason: 'superseded' },
		{ name: 'an Error reason', reason: new Error('superseded') },
	])('fails as aborted where the caller ends its own request: $name', async ({ reason }) => {
		stubPendingRequest()

		const caller = new AbortController()

		const answer = fetchOsrmRoute(WAYPOINTS, { signal: caller.signal, timeoutMs: 5000 })

		caller.abort(reason)

		expect(await answer).toEqual({ ok: false, failure: { kind: 'aborted', retryable: false } })
	})

	// `AbortSignal.timeout` throws on these, and the throw would reject the call
	// rather than answer it.
	it.for([Number.POSITIVE_INFINITY, Number.NaN, -1])(
		'answers rather than rejects where the timeout is no finite count: %s',
		async (timeoutMs) => {
			stubFetch({ ok: true, json: PAYLOAD })

			expect((await fetchOsrmRoute(WAYPOINTS, { timeoutMs })).ok).toBe(true)
		},
	)

	it('reads any other thrown request as a dead network', async () => {
		stubThrownRequest(new TypeError('Failed to fetch'))

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'network', retryable: true },
		})
	})

	it.for([
		{ name: 'a body that does not parse', stub: stubUnparseableBody },
		// Parsed, and still not an answer: a body naming neither a leg nor a
		// refusal, and a leg carrying neither geometry nor a total.
		{ name: 'a body with no leg', stub: () => stubFetch({ ok: true, json: {} }) },
		{ name: 'an empty leg', stub: () => stubFetch({ ok: true, json: { routes: [{}] } }) },
	])('reads a body that is no routing answer as a payload failure: $name', async ({ stub }) => {
		stub()

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'payload', retryable: false },
		})
	})

	// osrm-backend refuses a pair it cannot join under a 400, with its own code in
	// the body and no `routes` at all: the dead end a retry can never clear.
	it.for([
		{
			name: 'no road joins the pair',
			json: { code: 'NoRoute', message: 'Impossible route between points' },
			failure: { kind: 'no-route', retryable: false, code: 'NoRoute' },
		},
		{
			name: 'a point off the network',
			json: { code: 'NoSegment', message: 'Could not find a matching segment for any coordinate.' },
			failure: { kind: 'no-route', retryable: false, code: 'NoSegment' },
		},
		// A request the service will not read: the status is the evidence.
		{
			name: 'an invalid request',
			json: { code: 'InvalidValue', message: 'Invalid coordinate value.' },
			failure: { kind: 'http', status: 400, retryable: false },
		},
	])('reads the refusal in the body of a 400: $name', async ({ json, failure }) => {
		stubFetch({ ok: false, status: 400, json })

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({ ok: false, failure })
	})

	it('keeps the status where the body of a refused response does not parse', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
			}),
		)

		expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({
			ok: false,
			failure: { kind: 'http', status: 400, retryable: false },
		})
	})

	// A body under a 200 can still name a refusal in its own code.
	it.for([
		{
			name: 'a refusal code',
			json: { code: 'NoRoute', message: 'Impossible route between points' },
			failure: { kind: 'no-route', retryable: false, code: 'NoRoute' },
		},
		// An empty `routes` array says the same thing without naming it.
		{
			name: 'an empty routes array',
			json: { code: 'Ok', routes: [] },
			failure: { kind: 'no-route', retryable: false },
		},
	])(
		'reads the service`s own refusal under a 200 as no-route: $name',
		async ({ json, failure }) => {
			stubFetch({ ok: true, json })

			expect(await fetchOsrmRoute(WAYPOINTS)).toEqual({ ok: false, failure })
		},
	)

	it('honors a custom base URL and profile', async () => {
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

describe('requestSignal', () => {
	it('combines the two signals without `AbortSignal.any`, which the browser floor lacks', () => {
		// `.browserslistrc` admits browsers that ship no `AbortSignal.any`, and a
		// call there throws before the request goes out.
		const any = vi.spyOn(AbortSignal, 'any').mockImplementation(() => {
			throw new TypeError('AbortSignal.any is not a function')
		})

		const caller = new AbortController()

		const { signal } = requestSignal(caller.signal, 5000)

		expect(signal?.aborted).toBe(false)

		caller.abort()

		expect(signal?.aborted).toBe(true)
		expect(any).not.toHaveBeenCalled()
	})

	it('passes on the reason of the signal that fired', async () => {
		const caller = new AbortController()

		const reason = new DOMException('The operation was aborted', 'AbortError')

		const aborted = requestSignal(caller.signal, 5000)

		caller.abort(reason)

		expect(aborted.signal?.reason).toBe(reason)

		expect(aborted.timeout?.aborted).toBe(false)

		const timed = requestSignal(new AbortController().signal, 1)

		await new Promise((resolve) => timed.signal?.addEventListener('abort', resolve, { once: true }))

		expect((timed.signal?.reason as DOMException | undefined)?.name).toBe('TimeoutError')

		expect(timed.timeout?.aborted).toBe(true)
	})

	it('is aborted at once when the caller`s signal already is', () => {
		const reason = new DOMException('The operation was aborted', 'AbortError')

		const { signal } = requestSignal(AbortSignal.abort(reason), 5000)

		expect(signal?.aborted).toBe(true)
		expect(signal?.reason).toBe(reason)
	})

	it.for([Number.POSITIVE_INFINITY, Number.NaN, -1])(
		'sets no limit where the timeout is no finite count of zero or more: %s',
		(timeoutMs) => {
			const caller = new AbortController()

			expect(requestSignal(caller.signal, timeoutMs)).toEqual({
				signal: caller.signal,
				timeout: undefined,
			})
		},
	)
})

describe('thrownFailure', () => {
	// The thrown value is the caller's own reason, which can be anything, so only
	// the signal says which of the two ended the request.
	it.for([
		{ name: 'a string reason', reason: 'superseded' },
		{ name: 'an Error reason', reason: new Error('superseded') },
	])('reads an abort by the signal, not by the reason: $name', ({ reason }) => {
		const caller = new AbortController()

		const { signal, timeout } = requestSignal(caller.signal, 5000)

		caller.abort(reason)

		expect(thrownFailure('network', signal, timeout)).toEqual({ kind: 'aborted', retryable: false })
	})

	it('takes the fallback where no signal fired', () => {
		const { signal, timeout } = requestSignal(new AbortController().signal, 5000)

		expect(thrownFailure('payload', signal, timeout)).toEqual({ kind: 'payload', retryable: false })
	})
})

describe('refusedFailure', () => {
	it.for([
		{ name: 'no body', body: undefined },
		{ name: 'a body with no code', body: { message: 'Bad Request' } },
		{ name: 'a code that is not a string', body: { code: 404 } },
	])('keeps the status where the body names no refusal: $name', ({ body }) => {
		expect(refusedFailure(400, body)).toEqual({ kind: 'http', status: 400, retryable: false })
	})
})
