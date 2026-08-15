import { PlacesApp } from '@/components/places-app'

/**
 * The one page. Every surface below it is interactive — the map, the filter bar,
 * the drawers — and every fetch runs through TanStack Query, so the page holds
 * no data of its own and exists to mount the client tree.
 */
export default function Page() {
	return <PlacesApp />
}
