import { describe, expect, it } from 'vitest'
import { readGames, readSchedule } from '../server/espn-scoreboard'

function competitor(
	homeAway: string,
	id: string,
	abbreviation: string,
	score: string,
	winner?: boolean,
) {
	return {
		homeAway,
		score,
		winner,
		team: { id, abbreviation, displayName: `${abbreviation} team`, logo: `https://logo/${id}.png` },
	}
}

function event(state: string, winner?: 'home' | 'away') {
	return {
		id: '401',
		date: '2026-09-10T00:20Z',
		competitions: [
			{
				status: { type: { state } },
				competitors: [
					competitor('home', '12', 'KC', '24', winner === 'home'),
					competitor('away', '2', 'BUF', '17', winner === 'away'),
				],
			},
		],
	}
}

describe('readSchedule', () => {
	it('reads the season and the regular-season weeks', () => {
		const body = {
			leagues: [
				{
					season: { year: 2026 },
					calendar: [
						{ value: '1', entries: [{ value: '1', label: 'Hall of Fame Weekend' }] },
						{
							value: '2',
							entries: [
								{
									value: '1',
									label: 'Week 1',
									startDate: '2026-09-09T07:00Z',
									endDate: '2026-09-16T06:59Z',
								},
								{ value: '2', label: 'Week 2' },
							],
						},
					],
				},
			],
		}

		expect(readSchedule(body)).toEqual({
			season: 2026,
			weeks: [{ number: 1, label: 'Week 1', start: '2026-09-09T07:00Z', end: '2026-09-16T06:59Z' }],
		})
	})

	it('gives null for a body without a season', () => {
		expect(readSchedule({ leagues: [] })).toBeNull()
	})
})

describe('readGames', () => {
	it('reads a final game with its winner', () => {
		const [read] = readGames({ events: [event('post', 'home')] })

		expect(read).toMatchObject({
			id: '401',
			state: 'final',
			home: { id: '12', score: 24, winner: true, logo: 'https://logo/12.png' },
			away: { id: '2', score: 17, winner: false },
		})
	})

	it('gives no winner before the game is over', () => {
		const [read] = readGames({ events: [event('in', 'home')] })

		expect(read?.state).toBe('live')
		expect(read?.home.winner).toBe(false)
	})

	it('skips an event that does not match the shape', () => {
		expect(readGames({ events: [{ id: '402' }, event('pre')] })).toHaveLength(1)
	})
})
