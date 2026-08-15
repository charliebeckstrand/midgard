import { Suspense } from 'react'
import { PlacesApp } from '@/components/places-app'

/**
 * The one page. Every surface below it is interactive — the map, the filter bar,
 * the drawers — and every fetch runs through TanStack Query, so the page holds
 * no data of its own and exists to mount the client tree.
 *
 * The boundary is what `useSearchParams` asks of a page that prerenders: the
 * address is not known while the shell is built, so the tree that reads it waits
 * for the browser. The fallback is nothing, because there is nothing to hold the
 * reader's place with — the map draws its own skeleton the moment it mounts, and
 * a second skeleton above this line would only be a shape that swaps for another.
 */
export default function Page() {
	return (
		<Suspense>
			<PlacesApp />
		</Suspense>
	)
}
