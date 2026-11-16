import { unwrap } from 'shared/auth'
import { type components, createMimirClient, type paths } from 'shared/mimir'
import type { RunResult } from './stats-api'

/**
 * The calls of the browser to the leaderboards. Mimir, in asgard, keeps the
 * best score of each player on each board of each day, and shows each player by
 * the name of their account.
 */

/** The leaderboard of one board of one day. */
export type Board = components['schemas']['NumbersBoard']

/** One row of a leaderboard. */
export type BoardEntry = Board['entries'][number]

/**
 * A board of a day: `daily` for the solo runs of the daily puzzle, `solo` for
 * the solo runs of other seeds, and `vsCpu` for the runs against the CPU.
 */
export type BoardMode = paths['/api/games/numbers/daily']['get']['parameters']['query']['mode']

const mimir = createMimirClient()

/** The board `mode` of the day `date` (`YYYYMMDD`). */
export function readBoard(date: string, mode: BoardMode): Promise<Board> {
	return unwrap(mimir.GET('/api/games/numbers/daily', { params: { query: { date, mode } } }))
}

/** The board that a run counts on, by the rule that Mimir also uses. */
export function toBoardMode(result: RunResult): BoardMode {
	if (result.mode === 'vsCpu') return 'vsCpu'

	return result.seed === result.today ? 'daily' : 'solo'
}
