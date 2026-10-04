import { getWeekGames } from '@/server/scoreboard'

/**
 * The games of one week, for the prediction form. The form opens on the
 * schedule, which does not read the games of each week, so the browser asks
 * for them here. The scoreboard reader caches each week.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ season: string; week: string }> },
) {
	const { season, week } = await params

	const year = Number(season)

	const number = Number(week)

	if (!Number.isInteger(year) || !Number.isInteger(number) || number < 1) {
		return Response.json({ message: 'Unknown week' }, { status: 404 })
	}

	return Response.json(await getWeekGames(year, number))
}
