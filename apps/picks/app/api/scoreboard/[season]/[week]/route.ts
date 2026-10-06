import { getWeekGames } from '@/server/scoreboard'
import { readWeekPath, type WeekPathContext } from '@/server/week-path'

/**
 * The games of one week, for the prediction form. The form opens on the
 * schedule, which does not read the games of each week, so the browser asks
 * for them here. The scoreboard reader caches each week.
 */
export async function GET(_request: Request, context: WeekPathContext) {
	const path = await readWeekPath(context)

	if (path === null) return Response.json({ message: 'Unknown week' }, { status: 404 })

	return Response.json(await getWeekGames(path.season, path.week))
}
