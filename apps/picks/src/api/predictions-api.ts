import type { SeasonPicks, TeamPicks, WeekPicks } from '../types'

/**
 * The calls of the browser to the picks of the user. Mimir, in asgard, keeps
 * them, and the gateway forwards `/api/predictions/*` to it with the session.
 */

async function send<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: init?.body === undefined ? undefined : { 'content-type': 'application/json' },
	})

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { message?: unknown } | null

		throw new Error(
			typeof body?.message === 'string' ? body.message : `The request failed (${response.status}).`,
		)
	}

	return (response.status === 204 ? undefined : await response.json()) as T
}

/** Every pick of the user in `season`. */
export function listPicks(season: number): Promise<SeasonPicks> {
	return send(`/api/predictions/${season}`)
}

/** Writes the picks of one week, and answers with what was stored, each pick with its line. */
export function savePicks(season: number, week: number, picks: TeamPicks): Promise<WeekPicks> {
	return send(`/api/predictions/${season}/${week}`, {
		method: 'PUT',
		body: JSON.stringify({ picks }),
	})
}

/** Deletes the picks of one week. */
export function deletePicks(season: number, week: number): Promise<void> {
	return send(`/api/predictions/${season}/${week}`, { method: 'DELETE' })
}
