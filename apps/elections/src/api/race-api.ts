import type { Race } from '../types'

/**
 * The call of the browser to one race. The route handler of the app
 * (`app/api/races/[id]`) reads it from civicAPI.
 */

/** One race with its counties. */
export async function fetchRace(id: number, signal?: AbortSignal): Promise<Race> {
	const response = await fetch(`/api/races/${id}`, { signal })

	if (!response.ok) throw new Error('The race did not load. Try again.')

	return response.json()
}
