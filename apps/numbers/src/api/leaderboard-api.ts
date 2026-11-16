import { unwrap } from 'shared/auth'
import { type components, createMimirClient } from 'shared/mimir'
import type { Mode } from './stats-api'

/**
 * The calls of the browser to the leaderboards. Mimir, in asgard, keeps the
 * first run of each player of each daily puzzle, and shows each player by the
 * name of their account.
 */

/** The leaderboard of one daily puzzle in one mode. */
export type Board = components['schemas']['NumbersBoard']

/** One row of a leaderboard. */
export type BoardEntry = Board['entries'][number]

const mimir = createMimirClient()

/** The leaderboard of the daily puzzle of `date` (`YYYYMMDD`) in `mode`. */
export function readBoard(date: string, mode: Mode): Promise<Board> {
	return unwrap(mimir.GET('/api/games/numbers/daily', { params: { query: { date, mode } } }))
}
