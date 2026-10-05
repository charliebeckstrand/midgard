/** One side of a game. */
export type Team = {
	id: string
	/** The short code, such as `KC`. */
	abbreviation: string
	/** The full name, such as `Kansas City Chiefs`. */
	name: string
	/** The URL of the logo, or `null` when the feed gives none. */
	logo: string | null
	/** The points, or `null` before kickoff and in a game that is off. */
	score: number | null
	/** Whether the team won. Only a final game has a winner. */
	winner: boolean
}

/** Where a game is: not started, in play, over, or off. */
export type GameState = 'scheduled' | 'live' | 'final' | 'postponed' | 'canceled'

/** One game of a week. */
export type Game = {
	id: string
	/** The kickoff, as an ISO 8601 string. */
	kickoff: string
	state: GameState
	away: Team
	home: Team
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

/** The picks of one week: the id of the picked team for each game id. */
export type WeekPicks = Record<string, string>

/** The picks of one season, by week number. A week with no picks is absent. */
export type SeasonPicks = Record<string, WeekPicks>
