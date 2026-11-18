import { unwrap } from 'shared/auth'
import { type components, createMimirClient } from 'shared/mimir'

/**
 * The calls of the browser to the stats of the reader. Mimir, in asgard, keeps
 * them, and the gateway forwards `/api/games/*` to it with the session.
 */

/** The stats of each mode. */
export type NumbersStats = components['schemas']['NumbersStats']

/** The stats of one mode. */
export type ModeStats = components['schemas']['NumbersModeStats']

/** One finished run. */
export type RunResult = components['schemas']['NumbersResult']

/** A mode of the game. */
export type Mode = RunResult['mode']

const mimir = createMimirClient()

/** The stats of the reader. */
export function readStats(): Promise<NumbersStats> {
	return unwrap(mimir.GET('/api/games/numbers/stats'))
}

/** Counts one finished run, and answers with the new stats. */
export function recordResult(result: RunResult): Promise<NumbersStats> {
	return unwrap(mimir.POST('/api/games/numbers/results', { body: result }))
}
