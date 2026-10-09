import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Game } from '../types'
import { game } from './fixtures'

const { cacheLife, readGames } = vi.hoisted(() => ({
	cacheLife: vi.fn(),
	readGames: vi.fn<() => Game[]>(),
}))

vi.mock('next/cache', () => ({ cacheLife }))

vi.mock('../server/espn-scoreboard', async (importActual) => ({
	...(await importActual<typeof import('../server/espn-scoreboard')>()),
	readGames,
}))

const { getWeekGames } = await import('../server/scoreboard')

const KICKOFF = '2026-09-13T17:00Z'

const MINUTE = 60_000

/** The cache life that `getWeekGames` sets for `games` at `now`. */
async function lifeAt(games: Game[], now: number): Promise<unknown> {
	vi.setSystemTime(now)

	readGames.mockReturnValue(games)

	await getWeekGames(2026, 2)

	return cacheLife.mock.lastCall?.[0]
}

beforeEach(() => {
	vi.useFakeTimers()

	vi.stubGlobal('fetch', async () => Response.json({}))

	cacheLife.mockClear()
})

afterEach(() => {
	vi.useRealTimers()

	vi.unstubAllGlobals()
})

describe('getWeekGames', () => {
	const kickoff = Date.parse(KICKOFF)

	const scheduled = game({ kickoff: KICKOFF })

	it('holds a week in play for minutes', async () => {
		expect(await lifeAt([game({ state: 'live' }), scheduled], kickoff)).toBe('minutes')
	})

	it('holds a week that is over for days', async () => {
		expect(await lifeAt([game({ state: 'final' })], kickoff)).toBe('days')
	})

	it('holds a week for hours while its next kickoff is more than an hour away', async () => {
		expect(await lifeAt([scheduled], kickoff - 61 * MINUTE)).toBe('hours')
	})

	it('holds a week for minutes once its next kickoff is within an hour', async () => {
		expect(await lifeAt([scheduled], kickoff - 30 * MINUTE)).toBe('minutes')
	})

	it('holds a week for minutes when a kickoff passed and the feed still says scheduled', async () => {
		expect(await lifeAt([game({ state: 'final' }), scheduled], kickoff + MINUTE)).toBe('minutes')
	})
})
