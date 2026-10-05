import { mimir } from '@/server/mimir'
import { getWeekGames } from '@/server/scoreboard'
import type { TeamPicks } from '@/types'
import { kickedOff, mergePicks } from '@/utilities/locks'

/**
 * The writes of a prediction. Mimir keeps the picks but does not read the
 * schedule, so the app checks the kickoffs here before it sends a write
 * through the gateway: a locked game keeps its stored pick, and a week
 * deletes only before its first kickoff. The app serves this path, so the
 * gateway rewrite does not take it. The read of a season still goes straight
 * to the gateway.
 */

type Params = { params: Promise<{ season: string; week: string }> }

/** The season and the week of the path, or `null` for a path that names no week. */
async function readParams({ params }: Params): Promise<{ season: number; week: number } | null> {
	const { season, week } = await params

	const year = Number(season)

	const number = Number(week)

	return Number.isInteger(year) && Number.isInteger(number) && number >= 1
		? { season: year, week: number }
		: null
}

function refuse(status: number, message: string) {
	return Response.json({ message }, { status })
}

/** Whether a body maps each game id to the id of a team. The app sets the line. */
function isPicks(value: unknown): value is TeamPicks {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every((entry) => typeof entry === 'string')
	)
}

export async function PUT(request: Request, context: Params) {
	const path = await readParams(context)

	if (path === null) return refuse(404, 'Unknown week')

	const body = (await request.json().catch(() => null)) as { picks?: unknown } | null

	if (!isPicks(body?.picks)) return refuse(400, '`picks` must map each game to a team.')

	const [games, held] = await Promise.all([
		getWeekGames(path.season, path.week),
		mimir.GET('/api/predictions/{season}', { params: { path: { season: path.season } } }),
	])

	if (held.data === undefined) return refuse(held.response.status, 'The picks did not load.')

	const merged = mergePicks(games, held.data[path.week] ?? {}, body.picks, Date.now())

	if ('error' in merged) return refuse(400, merged.error)

	const { data, error, response } = await mimir.PUT('/api/predictions/{season}/{week}', {
		params: { path },
		body: { picks: merged.picks },
	})

	return Response.json(data ?? error, { status: response.status })
}

export async function DELETE(_request: Request, context: Params) {
	const path = await readParams(context)

	if (path === null) return refuse(404, 'Unknown week')

	if (kickedOff(await getWeekGames(path.season, path.week), Date.now())) {
		return refuse(409, 'The week has kicked off, so its prediction stays.')
	}

	const { error, response } = await mimir.DELETE('/api/predictions/{season}/{week}', {
		params: { path },
	})

	return error === undefined
		? new Response(null, { status: 204 })
		: Response.json(error, { status: response.status })
}
