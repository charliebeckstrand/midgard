import { getRace } from '@/server/races'
import { isKnownRace } from '@/server/results'

type Context = { params: Promise<{ id: string }> }

/**
 * One race with its counties, for the Drawer. The national results give each
 * race but not its counties, so the browser asks for them here when the Drawer
 * opens on a race. The race reader caches each race.
 */
export async function GET(_request: Request, { params }: Context) {
	const { id } = await params

	const raceId = Number(id)

	if (!Number.isInteger(raceId) || !(await isKnownRace(raceId))) {
		return Response.json({ message: 'Unknown race' }, { status: 404 })
	}

	return Response.json(await getRace(raceId))
}
