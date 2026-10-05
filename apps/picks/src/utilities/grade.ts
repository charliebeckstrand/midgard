import type { Game, Pick, WeekPicks } from '../types'

/** How a pick came out: right, wrong, a tie, or not known yet. */
export type Grade = 'right' | 'wrong' | 'tie' | null

/**
 * The line of `team` in `game` as a signed number: negative for the favorite,
 * positive for the underdog, and zero for a pick'em. `null` while the feed
 * gives no line.
 */
export function pickLine(game: Game, team: string): number | null {
	if (game.spread === null) return null

	return team === game.spread.favorite ? -game.spread.points : game.spread.points
}

/**
 * The line that scores `pick`: the line saved with the pick, or for a pick
 * saved before the line posted, the line of the game now. After the game the
 * feed gives the closing line. `null` while no line is known.
 */
export function scoredLine(game: Game, pick: Pick): number | null {
	return pick.line ?? pickLine(game, pick.team)
}

/** A signed line as it reads, such as `−3.5`, `+7`, or `PK`. */
export function formatLine(line: number): string {
	if (line === 0) return 'PK'

	return `${line < 0 ? '−' : '+'}${Math.abs(line)}`
}

/**
 * The points of a right pick on a team with `line`: 1 for a favorite or a
 * pick'em, and 1 more for each 3 points, or part of 3, that an underdog gets.
 */
export function pickPoints(line: number): number {
	return 1 + Math.ceil(Math.max(line, 0) / 3)
}

/** The team that won a final game, `'tie'` for a tie, or `null` before the game is over. */
function winner(game: Game): string | 'tie' | null {
	if (game.state !== 'final' || game.away.score === null || game.home.score === null) return null

	if (game.away.score === game.home.score) return 'tie'

	return game.away.score > game.home.score ? game.away.id : game.home.id
}

/** The grade of `pick` on `game`. A game that is not over, or that has no pick, has no grade. */
export function gradePick(game: Game, pick: Pick | undefined): Grade {
	if (pick === undefined) return null

	const won = winner(game)

	if (won === null) return null

	if (won === 'tie') return 'tie'

	return won === pick.team ? 'right' : 'wrong'
}

/** The record and the points of a week, or of a season, counted over graded picks. */
export type Tally = {
	right: number
	wrong: number
	tie: number
	/** The points of the right picks. */
	points: number
	/** The points of every graded pick, which is what a perfect week would score. */
	possible: number
}

export const EMPTY_TALLY: Tally = { right: 0, wrong: 0, tie: 0, points: 0, possible: 0 }

/** The tally of `picks` over `games`. */
export function tallyWeek(games: Game[], picks: WeekPicks): Tally {
	const tally = { ...EMPTY_TALLY }

	for (const game of games) {
		const pick = picks[game.id]

		const grade = gradePick(game, pick)

		if (grade === null || pick === undefined) continue

		// A game that never had a line scores as a pick'em.
		const points = pickPoints(scoredLine(game, pick) ?? 0)

		tally[grade] += 1

		tally.possible += points

		if (grade === 'right') tally.points += points
	}

	return tally
}

/** Whether `tally` counts a graded pick. */
export function isGraded(tally: Tally): boolean {
	return tally.right + tally.wrong + tally.tie > 0
}

/** The sum of two tallies. */
export function addTally(a: Tally, b: Tally): Tally {
	return {
		right: a.right + b.right,
		wrong: a.wrong + b.wrong,
		tie: a.tie + b.tie,
		points: a.points + b.points,
		possible: a.possible + b.possible,
	}
}

/** A record as it reads, such as `9–5` or `9–5–1` with a tie. */
export function formatRecord(tally: Tally): string {
	return [tally.right, tally.wrong, ...(tally.tie > 0 ? [tally.tie] : [])].join('–')
}

/** The share of decided picks at or above which a record reads as good. */
const GOOD_SHARE = 0.6

/** The share of decided picks at or below which a record reads as bad. */
const BAD_SHARE = 0.4

/**
 * The color of a record: green for a good share of right picks, red for a bad
 * share, and zinc between them or before a pick is decided. A tie does not count.
 */
export function recordColor(tally: Tally): 'green' | 'red' | 'zinc' {
	const decided = tally.right + tally.wrong

	if (decided === 0) return 'zinc'

	const share = tally.right / decided

	if (share >= GOOD_SHARE) return 'green'

	if (share <= BAD_SHARE) return 'red'

	return 'zinc'
}
