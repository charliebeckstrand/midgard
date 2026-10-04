import type { Game } from '../types'

/** How a pick came out: right, wrong, or not known yet. */
export type Grade = 'right' | 'wrong' | null

/**
 * The grade of the pick `teamId` on `game`. A game that is not over, or that
 * has no pick, has no grade. A tie has no winner, so every pick on it is wrong.
 */
export function gradePick(game: Game, teamId: string | undefined): Grade {
	if (teamId === undefined || game.state !== 'final') return null

	const winner = [game.away, game.home].find((team) => team.winner)

	return winner?.id === teamId ? 'right' : 'wrong'
}
