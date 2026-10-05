import type { Game, Pick, TeamPicks, WeekPicks } from '../types'
import { pickLine } from './grade'

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

/** Whether every game of `games` is locked, so the week takes no more picks. */
export function weekClosed(games: Game[], now: number): boolean {
	return games.every((game) => isLocked(game, now))
}

/** Whether `game` is postponed or canceled. Such a game is locked and has no grade. */
export function isOff(game: Game): game is Game & { state: 'postponed' | 'canceled' } {
	return game.state === 'postponed' || game.state === 'canceled'
}

/** The pick to store for `game`: see {@link mergePicks}. */
function mergedPick(
	game: Game,
	stored: Pick | undefined,
	team: string | undefined,
	now: number,
): Pick | undefined {
	if (isLocked(game, now)) return stored

	if (team === undefined) return undefined

	return stored?.team === team ? stored : { team, line: pickLine(game, team) }
}

/**
 * The picks to store for a week. A locked game keeps its stored pick, so a
 * locked pick neither changes nor goes away. An open game keeps its stored
 * pick where the team is the same, so a save does not move the line of a pick
 * that did not change. A new or changed pick takes the line of its team now.
 * A pick of a game that is not in the week, or of a team that does not play
 * in the game, is an error.
 */
export function mergePicks(
	games: Game[],
	stored: WeekPicks,
	submitted: TeamPicks,
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
		const pick = mergedPick(game, stored[game.id], submitted[game.id], now)

		if (pick !== undefined) picks[game.id] = pick
	}

	return { picks }
}
