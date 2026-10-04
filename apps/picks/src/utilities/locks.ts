import type { Game, WeekPicks } from '../types'

/**
 * A game locks at its kickoff: from then on its pick does not change. The
 * kickoff time counts as well as the state, because the cache can hold a week
 * past a kickoff with the game still `scheduled`.
 */
export function isLocked(game: Game, now: number): boolean {
	return game.state !== 'scheduled' || Date.parse(game.kickoff) <= now
}

/**
 * Whether any game of `games` has kicked off. A prediction of a week deletes
 * only before its first kickoff.
 */
export function kickedOff(games: Game[], now: number): boolean {
	return games.some((game) => isLocked(game, now))
}

/**
 * The picks to store for a week: the submitted pick of each open game, and
 * the stored pick of each locked game, so a locked pick neither changes nor
 * goes away. A pick of a game that is not in the week, or of a team that does
 * not play in the game, is an error.
 */
export function mergePicks(
	games: Game[],
	stored: WeekPicks,
	submitted: WeekPicks,
	now: number,
): { picks: WeekPicks } | { error: string } {
	const byId = new Map(games.map((game) => [game.id, game]))

	for (const [gameId, teamId] of Object.entries(submitted)) {
		const game = byId.get(gameId)

		if (game === undefined) return { error: `No game ${gameId} in this week.` }

		if (teamId !== game.away.id && teamId !== game.home.id) {
			return { error: `Team ${teamId} does not play in game ${gameId}.` }
		}
	}

	const picks: WeekPicks = {}

	for (const game of games) {
		const pick = isLocked(game, now) ? stored[game.id] : submitted[game.id]

		if (pick !== undefined) picks[game.id] = pick
	}

	return { picks }
}
