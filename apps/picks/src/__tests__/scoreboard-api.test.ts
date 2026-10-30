import { describe, expect, it, vi } from 'vitest'
import { fetchWeekGames } from '../api/scoreboard-api'
import { game } from './fixtures'

describe('scoreboard api', () => {
	it('asks the route handler for the week and answers with its games', async () => {
		const games = [game()]
		const fetch = vi.fn(async () => Response.json(games))

		vi.stubGlobal('fetch', fetch)

		await expect(fetchWeekGames(2026, 5)).resolves.toEqual(games)

		expect(fetch).toHaveBeenCalledWith('/api/scoreboard/2026/5', { signal: undefined })
	})

	it('throws a message for the form when the route handler fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ message: 'Unknown week' }, { status: 404 })),
		)

		await expect(fetchWeekGames(2026, 30)).rejects.toThrow('The games did not load. Try again.')
	})
})
