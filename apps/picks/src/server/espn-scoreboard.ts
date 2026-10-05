import type { Game, GameState, Schedule, Team, Week } from '../types'

/**
 * The reader of the public scoreboard of ESPN. The feed has no contract, so
 * each reader checks the shape of each field and skips a record that does not
 * match. A changed feed then gives an empty list, not an error on the page.
 */

/** The value of the season type of the regular season in the feed. */
const REGULAR_SEASON = '2'

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function records(value: unknown): Json[] {
	return Array.isArray(value) ? value.filter(isRecord) : []
}

function text(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null
}

/**
 * The season year and the regular-season weeks of a scoreboard response. Any
 * scoreboard response carries the calendar of its season.
 */
export function readSchedule(body: unknown): Schedule | null {
	if (!isRecord(body)) return null

	const league = records(body.leagues)[0]

	const season = isRecord(league?.season) ? league.season.year : undefined

	if (typeof season !== 'number') return null

	const regular = records(league?.calendar).find((part) => part.value === REGULAR_SEASON)

	const weeks = records(regular?.entries).flatMap((entry): Week[] => {
		const number = Number(entry.value)

		const label = text(entry.label)

		const start = text(entry.startDate)

		const end = text(entry.endDate)

		if (!Number.isInteger(number) || label === null || start === null || end === null) return []

		return [{ number, label, start, end }]
	})

	return { season, weeks }
}

/** The status names of the feed for a game that is off, by state. */
const OFF: Record<string, GameState> = {
	STATUS_POSTPONED: 'postponed',
	STATUS_CANCELED: 'canceled',
}

/**
 * The state of a competition. The feed gives a postponed or a canceled game
 * the state of a game that is over, so the status name comes first.
 */
function readState(status: unknown): GameState | null {
	const type = isRecord(status) && isRecord(status.type) ? status.type : null

	const off = typeof type?.name === 'string' ? OFF[type.name] : undefined

	if (off !== undefined) return off

	switch (type?.state) {
		case 'pre':
			return 'scheduled'
		case 'in':
			return 'live'
		case 'post':
			return 'final'
		default:
			return null
	}
}

/**
 * One side of a competition. The feed gives a score of `0` before kickoff, so
 * only a game in play or over has a score.
 */
function readTeam(competitor: Json, state: GameState): Team | null {
	const team = isRecord(competitor.team) ? competitor.team : null

	const id = text(team?.id)

	const abbreviation = text(team?.abbreviation)

	const name = text(team?.displayName)

	if (id === null || abbreviation === null || name === null) return null

	const points = Number(text(competitor.score) ?? Number.NaN)

	return {
		id,
		abbreviation,
		name,
		logo: text(team?.logo),
		score: (state === 'live' || state === 'final') && Number.isFinite(points) ? points : null,
		winner: state === 'final' && competitor.winner === true,
	}
}

/** The games of a scoreboard response, in the order of the feed. */
export function readGames(body: unknown): Game[] {
	if (!isRecord(body)) return []

	return records(body.events).flatMap((event): Game[] => {
		const competition = records(event.competitions)[0]

		const id = text(event.id)

		const kickoff = text(event.date)

		const state = readState(competition?.status ?? event.status)

		if (competition === undefined || id === null || kickoff === null || state === null) return []

		const competitors = records(competition.competitors)

		const side = (homeAway: string) => {
			const competitor = competitors.find((entry) => entry.homeAway === homeAway)

			return competitor === undefined ? null : readTeam(competitor, state)
		}

		const away = side('away')

		const home = side('home')

		if (away === null || home === null) return []

		return [{ id, kickoff, state, away, home }]
	})
}
