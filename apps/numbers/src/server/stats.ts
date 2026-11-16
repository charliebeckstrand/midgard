import { createGatewayClient, requireGateway, type User } from 'auth'
import { unstable_rethrow } from 'next/navigation'
import { connection } from 'next/server'
import type { paths } from 'shared/mimir'
import { seed as withReadTime } from 'shared/queries'
import type { NumbersStats } from '../api/stats-api'
import type { ServerStats } from '../hooks/use-daily-notice'
import { parseOffset } from '../utilities/reader-offset'
import { dailySeedAt } from '../utilities/seed'

/**
 * The typed client of Mimir on the server, through the gateway. It forwards the
 * session cookies of the request, so the page reads the stats of its user.
 */
const mimir = createGatewayClient<paths>()

/** The stats of the user of the request as of `today` (`YYYYMMDD`), or none when the read fails. */
function readStats(today: string): Promise<NumbersStats | undefined> {
	const path = '/api/games/numbers/stats'

	return requireGateway(path, () => mimir.GET(path, { params: { query: { today } } })).catch(
		(error: unknown) => {
			unstable_rethrow(error)

			console.error('numbers: the stats could not be read', error)

			return undefined
		},
	)
}

/**
 * The stats of the daily puzzle of today, when the run of the page is that
 * puzzle, so the first paint has the notice of a replay (see `useDailyNotice`).
 *
 * The day is the day of the reader, from the offset of the cookie of the
 * browser (`OFFSET_COOKIE`). With no cookie, the server does not know the day,
 * and the browser reads the stats after the hydration. A reader with no session
 * or with no verified email has no stats. A failed read gives no stats too, and
 * the browser reads them again.
 *
 * @param seed - The seed of the run of the page.
 * @param offset - The value of the offset cookie of the request.
 * @param user - The signed-in user, or none.
 */
export async function readDailyStats(
	seed: string,
	offset: string | undefined,
	user: User | undefined,
): Promise<ServerStats | undefined> {
	const minutes = parseOffset(offset)

	if (!user?.is_verified || minutes === null) return undefined

	// The day comes from the clock of the request, not from a prerender.
	await connection()

	const today = dailySeedAt(Date.now(), minutes)

	if (seed !== today) return undefined

	const stats = await readStats(today)

	return stats && { today, stats: withReadTime(stats) }
}
