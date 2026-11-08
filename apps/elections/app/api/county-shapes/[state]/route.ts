import { stateOfKey } from '@/elections/us-states'
import { countyShapes } from '@/server/county-shapes'

type Context = { params: Promise<{ state: string }> }

/**
 * A day, in seconds. The atlas changes only with a release of the app. A
 * release that changes the form of the shapes must also change this path, or
 * a browser draws the shapes it holds from the release before.
 */
const DAY = 86_400

/**
 * The county shapes of one state, for the county map of the Drawer. The atlas
 * of all counties is too large for the browser, so the browser asks for the
 * counties of one state here.
 */
export async function GET(_request: Request, { params }: Context) {
	const { state } = await params

	const region = stateOfKey(state)

	if (region === undefined) return Response.json({ message: 'Unknown state' }, { status: 404 })

	return new Response(countyShapes(region.fips), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${DAY}`,
		},
	})
}
