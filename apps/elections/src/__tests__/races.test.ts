import { afterEach, describe, expect, it, vi } from 'vitest'
import { nationalRace, race } from '../server/races'
import gaSenate from './fixtures/ga-senate.json'
import senate from './fixtures/senate.json'

// Next keeps the shortest life of all the `cacheLife` calls in one cache scope.
// So each case expects exactly one call.
const cacheLife = vi.hoisted(() => vi.fn())

vi.mock('next/cache', () => ({ cacheLife }))

/** Stubs the answer of civicAPI. */
function stubCivic(answer: () => Promise<Response>) {
	const fetch = vi.fn(answer)

	vi.stubGlobal('fetch', fetch)

	return fetch
}

afterEach(() => {
	vi.unstubAllGlobals()

	cacheLife.mockReset()
})

describe('nationalRace', () => {
	it('reads a national race, and the cache keeps it while the count goes on', async () => {
		stubCivic(async () => Response.json(senate))

		const read = await nationalRace(87528)

		expect(read.regions.length).toBeGreaterThan(0)

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes')
	})

	// A prerender leaves out an entry with a short life, so an outage of
	// civicAPI does not fail the build, and the static shell keeps no failure.
	it('throws an answer that is not OK, and the cache keeps it for seconds', async () => {
		stubCivic(async () => new Response('', { status: 522 }))

		await expect(nationalRace(87528)).rejects.toThrow('civicAPI answered 522 for race 87528.')

		expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds')
	})

	it('throws when civicAPI does not answer, and the cache keeps it for seconds', async () => {
		stubCivic(() => Promise.reject(new TypeError('fetch failed')))

		await expect(nationalRace(87528)).rejects.toThrow('civicAPI did not answer for race 87528.')

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
})
