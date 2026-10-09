import { createMimirClient, type paths, settle } from 'shared/mimir'
import type { SeasonPicks, TeamPicks, WeekPicks } from '../types'

/**
 * The calls of the browser to the picks of the user. Mimir, in asgard, keeps
 * them, and the gateway forwards `/api/predictions/*` to it with the session.
 */

type WeekPath = paths['/api/predictions/{season}/{week}']

/**
 * The paths of Mimir, with the write of a week as the app serves it
 * (`app/api/predictions/[season]/[week]`): the body gives a team id for each
 * game, and the app sets each line.
 */
type PicksPaths = Omit<paths, '/api/predictions/{season}/{week}'> & {
	'/api/predictions/{season}/{week}': Omit<WeekPath, 'put'> & {
		put: Omit<WeekPath['put'], 'requestBody'> & {
			requestBody: { content: { 'application/json': { picks: TeamPicks } } }
		}
	}
}

const mimir = createMimirClient<PicksPaths>()

/** Every pick of the user in `season`. */
export function listPicks(season: number): Promise<SeasonPicks> {
	return settle(mimir.GET('/api/predictions/{season}', { params: { path: { season } } }))
}

/** Writes the picks of one week, and answers with what was stored, each pick with its line. */
export function savePicks(season: number, week: number, picks: TeamPicks): Promise<WeekPicks> {
	return settle(
		mimir.PUT('/api/predictions/{season}/{week}', {
			params: { path: { season, week } },
			body: { picks },
		}),
	)
}

/** Deletes the picks of one week. */
export async function deletePicks(season: number, week: number): Promise<void> {
	await settle(
		mimir.DELETE('/api/predictions/{season}/{week}', { params: { path: { season, week } } }),
	)
}
