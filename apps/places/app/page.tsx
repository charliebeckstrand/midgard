import { requireSession } from 'auth'
import { Suspense } from 'react'
import { PlacesApp } from '@/components/places-app'
import { visitedSeed } from '@/server/visited-seed'
import { listVisits } from '@/server/visits-store'

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
 * The boundary is what `useSearchParams` asks of a page that prerenders: the
 * address is not known while the shell is built, so the tree that reads it waits
 * for the browser. The fallback is nothing, because there is nothing to hold the
 * reader's place with — the map and the filter bar draw their own skeletons the
 * moment they mount, and a second skeleton above this line would only be a shape
 * that swaps for another.
 */
export default async function Page() {
	const { user } = await requireSession()

	const visits = await listVisits(user.id, () => visitedSeed(user.id))

	return (
		<Suspense>
			<PlacesApp user={user} visits={visits} />
		</Suspense>
	)
}
