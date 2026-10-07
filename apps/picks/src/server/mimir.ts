import { createGatewayClient, requireGateway } from 'auth'
import type { paths } from 'shared/mimir'
import type { SeasonPicks } from '../types'

/**
 * The typed client of Mimir on the server, through the gateway. It forwards the
 * session cookies of the request, so the page reads the data of its user.
 */
export const mimir = createGatewayClient<paths>()

/** Every pick of the user in `season`. A failed read throws the error of the gateway. */
export async function getSeasonPicks(season: number): Promise<SeasonPicks> {
	const picks = await requireGateway('/api/predictions', () =>
		mimir.GET('/api/predictions/{season}', { params: { path: { season } } }),
	)

	return picks ?? {}
}
