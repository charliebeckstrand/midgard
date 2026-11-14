import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUT } from '../../app/api/predictions/[season]/[week]/route'
import { mimir } from '../server/mimir'
import { getWeekGames } from '../server/scoreboard'
import { game } from './fixtures'

vi.mock('../server/mimir', () => ({ mimir: { GET: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }))

vi.mock('../server/scoreboard', () => ({ getWeekGames: vi.fn() }))

const KICKOFF = Date.parse('2026-09-10T00:20Z')

const first = game({ id: 'g1', kickoff: '2026-09-10T00:20Z' })

const last = game({ id: 'g2', kickoff: '2026-09-14T17:00Z' })

const context = { params: Promise.resolve({ season: '2026', week: '1' }) }

function put(picks: Record<string, string>) {
	return PUT(
		new Request('http://picks.test/api/predictions/2026/1', {
			method: 'PUT',
			body: JSON.stringify({ picks }),
		}),
		context,
	)
}

beforeEach(() => {
	vi.mocked(getWeekGames).mockResolvedValue([first, last])

	// The user has no prediction of the week.
	vi.mocked(mimir.GET).mockResolvedValue({
		data: {},
		response: new Response(null, { status: 200 }),
	} as never)

	vi.mocked(mimir.PUT).mockResolvedValue({
		data: {},
		response: new Response(null, { status: 200 }),
	} as never)
})

describe('PUT /api/predictions/{season}/{week}', () => {
	it('sends the picks of the open games', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(KICKOFF + 1)

		const response = await put({ g2: last.home.id })

		expect(response.status).toBe(200)

		expect(mimir.PUT).toHaveBeenCalledWith('/api/predictions/{season}/{week}', {
			params: { path: { season: 2026, week: 1 } },
			body: { picks: { g2: { team: last.home.id, line: null } } },
		})
	})

	// A sheet that opened before the last kickoff can save after it.
	it('refuses a week whose games are all locked, and sends no write', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(Date.parse(last.kickoff))

		const response = await put({ g2: last.home.id })

		expect(response.status).toBe(409)

		expect(mimir.PUT).not.toHaveBeenCalled()
	})
})
