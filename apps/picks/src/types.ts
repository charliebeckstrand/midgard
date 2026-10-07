import type { components } from 'shared/mimir'

/** One side of a game. */
export type Team = {
	id: string
	/** The short code, such as `KC`. */
	abbreviation: string
	/** The full name, such as `Kansas City Chiefs`. */
	name: string
	/** The URL of the logo, or `null` when the feed gives none. */
	logo: string | null
	/** The points, or `null` before kickoff. */
	score: number | null
	/** Whether the team won. Only a final game has a winner. */
	winner: boolean
}

/**
 * Where a game is: not started, in play, or over, or postponed or canceled.
 * A postponed or a canceled game has no score and no grade.
 */
export type GameState = 'scheduled' | 'live' | 'final' | 'postponed' | 'canceled'

/** One game of a week. */
export type Game = {
	id: string
	/** The kickoff, as an ISO 8601 string. */
	kickoff: string
	state: GameState
	/** The status line of the feed, such as `4:12 - 3rd` or `Final/OT`. */
	detail: string | null
	/** The line of the game, or `null` where the feed gives none. */
	spread: Spread | null
	away: Team
	home: Team
}

/** The point spread of a game: the favorite and the points it gives. */
export type Spread = {
	/** The id of the favored team. */
	favorite: string
	/** The points the favorite gives, such as `3.5`. Zero is a pick'em. */
	points: number
}

/** One week of the regular season. */
export type Week = {
	/** The week number, from 1. */
	number: number
	/** The label of the feed, such as `Week 1`. */
	label: string
	/** The first day of the week, as an ISO 8601 string. */
	start: string
	/** The last day of the week, as an ISO 8601 string. */
	end: string
}

/** The regular season: its year and its weeks. */
export type Schedule = {
	season: number
	weeks: Week[]
}

/**
 * The picks of one week, by game id, as Mimir stores them. `pnpm --filter
 * shared openapi` generates the shape from its spec, so the app and the
 * service cannot disagree about a pick.
 */
export type WeekPicks = components['schemas']['WeekPicks']

/**
 * One pick: the team picked to win, and its line when the pick was saved.
 *
 * `line` is the line of the team as a signed number, such as `-3.5` for a
 * favorite or `7` for an underdog. It sets the points of the pick, so a later
 * move of the line does not change them. It is `null` for a pick saved before
 * the line posted: the closing line scores it.
 */
export type Pick = WeekPicks[string]

/** The picks of one season, by week number. A week with no picks is absent. */
export type SeasonPicks = components['schemas']['SeasonPicks']

/**
 * The id of the picked team of each game, by game id: what the form sends. The
 * app sets the line of each pick when it stores the picks.
 */
export type TeamPicks = Record<string, string>
