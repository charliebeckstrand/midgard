import { cacheLife } from 'next/cache'
import type { Game, Schedule } from '../types'
import { REGULAR_SEASON, readGames, readSchedule } from './espn-scoreboard'

/** The scoreboard of the NFL in the public API of ESPN. It needs no key. */
const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'

/** The revalidate time of the `hours` cache life, in milliseconds. */
const HOUR = 60 * 60 * 1000

async function scoreboard(search: Record<string, string> = {}): Promise<unknown> {
	const response = await fetch(`${SCOREBOARD}?${new URLSearchParams(search)}`)

	if (!response.ok) throw new Error(`The scoreboard answered ${response.status}.`)

	return response.json()
}

/**
 * The weeks of the current regular season. The scoreboard without a date gives
 * the current season, and its calendar holds every week.
 *
 * @remarks The calendar changes once a season, so the cache holds it for days.
 */
export async function getSchedule(): Promise<Schedule> {
	'use cache'

	cacheLife('days')

	const schedule = readSchedule(await scoreboard())

	if (schedule === null) throw new Error('The scoreboard gave no calendar.')

	return schedule
}

/**
 * The games of one week of a regular season.
 *
 * @remarks
 * A week in play changes each minute, a week that is over does not change, and
 * a week to come changes only when a kickoff moves. The cache life follows. A
 * week with a kickoff within the hour, or past it, also takes the life of a
 * week in play, so the live scores start at kickoff and not up to an hour late.
 */
export async function getWeekGames(season: number, week: number): Promise<Game[]> {
	'use cache'

	const games = readGames(
		await scoreboard({ dates: String(season), seasontype: REGULAR_SEASON, week: String(week) }),
	)

	const now = Date.now()

	const kickoffSoon = games.some(
		(game) => game.state === 'scheduled' && Date.parse(game.kickoff) - now < HOUR,
	)

	if (kickoffSoon || games.some((game) => game.state === 'live')) cacheLife('minutes')
	else if (games.length > 0 && games.every((game) => game.state === 'final')) cacheLife('days')
	else cacheLife('hours')

	return games
}
