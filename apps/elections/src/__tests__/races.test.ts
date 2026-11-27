import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nationalRace, race } from '../server/races'
import gaSenate from './fixtures/ga-senate.json'
import senate from './fixtures/senate.json'

// Next keeps the shortest life of all the `cacheLife` calls in one cache scope.
// So each case expects exactly one call.
const cacheLife = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({ cacheLife }))

/** Stubs the answer of civicAPI. */
function stubCivic(answer: typeof fetch) {
	const fetch = vi.fn(answer)

	vi.stubGlobal('fetch', fetch)

	return fetch
}

// Each failure warns once, so that the build log names each race that it leaves out.
const warn = vi.fn()

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(warn)
})

afterEach(() => {
	vi.unstubAllGlobals()

	vi.restoreAllMocks()

	warn.mockReset()

	cacheLife.mockReset()
})

describe('nationalRace', () => {
	it('reads a national race, and the cache keeps it while the count goes on', async () => {
		stubCivic(async () => Response.json(senate))

		const read = await nationalRace(87528)

		expect(read.regions.length).toBeGreaterThan(0)

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes')

		expect(warn).not.toHaveBeenCalled()
	})

	// A prerender leaves out an entry with a short life, so an outage of
	// civicAPI does not fail the build, and the static shell keeps no failure.
	it('throws an answer that is not OK, and the cache keeps it for seconds', async () => {
		stubCivic(async () => new Response('', { status: 522 }))

		await expect(nationalRace(87528)).rejects.toThrow('civicAPI answered 522 for race 87528.')

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')
	})

	it('throws when civicAPI does not answer, with the cause, and warns once', async () => {
		stubCivic(() =>
			Promise.reject(
				new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 1.2.3.4:443') }),
			),
		)

		const message =
			'civicAPI did not answer for race 87528 (Error: connect ECONNREFUSED 1.2.3.4:443).'

		await expect(nationalRace(87528)).rejects.toThrow(message)

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')

		expect(warn).toHaveBeenCalledExactlyOnceWith(message)
	})

	// A late answer must fail before the 54 s that a prerender gives a cache
	// fill. Fake timers do not reach the timer of `AbortSignal.timeout`, so the
	// case aborts the signal itself.
	it('throws when civicAPI answers late, before the prerender times out', async () => {
		const deadline = new AbortController()

		const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal)

		stubCivic(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
				}),
		)

		const read = nationalRace(87528)

		deadline.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))

		await expect(read).rejects.toThrow(
			'civicAPI did not answer for race 87528 (TimeoutError: The operation was aborted due to timeout).',
		)

		expect(timeout.mock.calls[0]?.[0]).toBeLessThan(54_000)

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')
	})

	it('throws when the body of an OK answer breaks off, and the cache keeps it for seconds', async () => {
		stubCivic(async () => {
			const body = new ReadableStream({
				pull(controller) {
					controller.error(new TypeError('terminated'))
				},
			})

			return new Response(body, { status: 200 })
		})

		await expect(nationalRace(87528)).rejects.toThrow(
			'civicAPI broke off the answer for race 87528 (TypeError: terminated).',
		)

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')
	})
})

describe('race', () => {
	it('reads a race of a state with its counties', async () => {
		stubCivic(async () => Response.json(gaSenate))

		const read = await race(87087)

		expect(read.counties.length).toBeGreaterThan(0)

		expect(cacheLife).toHaveBeenCalledOnce()
	})

	it('throws an answer that is not OK, and the cache keeps it for seconds', async () => {
		stubCivic(async () => new Response('', { status: 503 }))

		await expect(race(87087)).rejects.toThrow('civicAPI answered 503 for race 87087.')

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')
	})

	it('throws an answer that the parser cannot read', async () => {
		stubCivic(async () => Response.json({}))

		await expect(race(87087)).rejects.toThrow()

		expect(cacheLife).not.toHaveBeenCalled()
	})

	it('throws an OK answer that is not JSON', async () => {
		stubCivic(async () => new Response('<html>', { status: 200 }))

		await expect(race(87087)).rejects.toThrow(SyntaxError)

		expect(cacheLife).not.toHaveBeenCalled()
	})
})
