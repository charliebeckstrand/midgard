import { unwrap } from 'shared/auth'
import { type components, createMimirClient } from 'shared/mimir'
import type { Mode } from './stats-api'

/**
 * The calls of the browser to the leaderboards. Mimir, in asgard, keeps the
 * first run of each player of each daily puzzle, and the name that each player
 * shows on the boards.
 */

/** The leaderboard of one daily puzzle in one mode. */
export type Board = components['schemas']['NumbersBoard']

/** One row of a leaderboard. */
export type BoardEntry = Board['entries'][number]

/** The leaderboard name of the reader, or `null` when they show as anonymous. */
export type Player = components['schemas']['GamePlayer']

const mimir = createMimirClient()

/** The leaderboard of the daily puzzle of `date` (`YYYYMMDD`) in `mode`. */
export function readBoard(date: string, mode: Mode): Promise<Board> {
	return unwrap(mimir.GET('/api/games/numbers/daily', { params: { query: { date, mode } } }))
}

/** The leaderboard name of the reader. */
export function readPlayer(): Promise<Player> {
	return unwrap(mimir.GET('/api/games/player'))
}

/** Sets the leaderboard name of the reader. `null` shows them as anonymous. */
export function savePlayer(player: Player): Promise<Player> {
	return unwrap(mimir.PUT('/api/games/player', { body: player }))
}
