import type { Game } from '../types'

/**
 * The call of the browser to the games of a week. The route handler of the app
 * (`app/api/scoreboard/[season]/[week]`) reads them from the scoreboard.
 */

/** The games of one week. */
export async function fetchWeekGames(
	season: number,
	week: number,
	signal?: AbortSignal,
): Promise<Game[]> {
	const response = await fetch(`/api/scoreboard/${season}/${week}`, { signal })

	if (!response.ok) throw new Error('The games did not load. Try again.')

	return response.json()
}
