import type { Game, Team } from '../types'

/** A team with the fields that a test does not set filled in. */
export function team(overrides: Partial<Team> = {}): Team {
	return {
		id: '12',
		abbreviation: 'KC',
		name: 'Kansas City Chiefs',
		logo: null,
		score: null,
		winner: false,
		...overrides,
	}
}

/** A game with the fields that a test does not set filled in. */
export function game(overrides: Partial<Game> = {}): Game {
	return {
		id: '401',
		kickoff: '2026-09-10T00:20Z',
		state: 'scheduled',
		away: team({ id: '2', abbreviation: 'BUF', name: 'Buffalo Bills' }),
		home: team(),
		...overrides,
	}
}
