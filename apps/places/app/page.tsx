import { requireGateway, requireSession } from 'auth'
import { seed } from 'shared/queries'
import { PlacesApp } from '@/components/places-app'
import { flags } from '@/flags'
import { mimir } from '@/server/mimir'

/**
 * The page reads the session, the places, and the visits before it renders. The
 * route blocks, because the app must know the places and the visits on the
 * first frame, as the comment of the page tells.
 */
export const instant = false

/**
 * The one page. Every surface below it is interactive — the map, the filter bar,
 * the drawers — and every fetch runs through TanStack Query, so the page exists
 * to mount the client tree.
 *
 * `requireSession` checks the session on the gateway, and sends a guest to
 * `/login`. The page hands the user to the menu of the app.
 *
 * The page also reads the visited set of the user, the same set that
 * `/api/visits` gives, and hands it to the app as the first value of that query.
 * The Visited toggle in the header shows a state that the reader looks for, so
 * it must paint its true state on the first frame. A placeholder there would
 * only hold a shape where the server already knows the answer. The set is small:
 * at most one name for each region the reader marked.
 *
 * It reads the trips the same way, for the same reason: the Show filter, My
 * trips, and the trip squares must be right on the first frame.
 *
 * It reads the places of the user in the same way, the same list that
 * `/api/places` gives. The filter bar shows only when there are places, so the
 * app must know the list on the first frame. If not, the bar comes in when the
 * list lands, and the map under it gets smaller.
 *
 * The page renders the app with no Suspense boundary. The route blocks, so
 * `useSearchParams` reads the address of the request, and the markup of the app
 * is in the document. A boundary streams its content in a hidden segment, and
 * React later moves the segment into the page, at times from an animation
 * frame callback. In WebKit, a scroll-driven animation on an element that comes
 * in from that callback has no effect in that paint. Thus the edge fade of the
 * filter bar blinked.
 */
export default async function Page() {
	const { user } = await requireSession()

	// The visits only while the visited regions feature is on, because nothing
	// else reads them.
	const [places = [], trips = [], visits = { states: [], countries: [] }] = await Promise.all([
		requireGateway('/api/places', () => mimir.GET('/api/places')),
		requireGateway('/api/trips', () => mimir.GET('/api/trips')),
		flags.visitedRegions
			? requireGateway('/api/visits', () => mimir.GET('/api/visits'))
			: undefined,
	])

	return <PlacesApp user={user} places={seed(places)} trips={seed(trips)} visits={seed(visits)} />
}
