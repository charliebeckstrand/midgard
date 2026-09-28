import { requireGateway, requireSession } from 'auth'
import { Suspense } from 'react'
import { preload } from 'react-dom'
import { PlacesApp } from '@/components/places-app'
import { mimir } from '@/server/mimir'

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
 * It reads the places of the user in the same way, the same list that
 * `/api/places` gives. The filter bar shows only when there are places, so the
 * app must know the list on the first frame. If not, the bar comes in when the
 * list lands, and the map under it gets smaller.
 *
 * The boundary is what `useSearchParams` asks of a page that prerenders: the
 * address is not known while the shell is built, so the tree that reads it waits
 * for the browser. The fallback is nothing, because there is nothing to hold the
 * reader's place with — the map and the filter bar draw their own skeletons the
 * moment they mount, and a second skeleton above this line would only be a shape
 * that swaps for another.
 */
export default async function Page() {
	// The app draws nothing until the states atlas lands, and its own fetch starts
	// only after hydration. The hint in the head starts the download with the page,
	// and the fetch of the app then reads the response the browser already has.
	// `anonymous` is the mode of a same-origin `fetch`, so the two requests match.
	preload('/api/atlas/states', { as: 'fetch', crossOrigin: 'anonymous' })

	const { user } = await requireSession()

	const [places = [], visits = { states: [], countries: [] }] = await Promise.all([
		requireGateway('/api/places', () => mimir.GET('/api/places')),
		requireGateway('/api/visits', () => mimir.GET('/api/visits')),
	])

	return (
		<Suspense>
			<PlacesApp user={user} places={places} visits={visits} />
		</Suspense>
	)
}
