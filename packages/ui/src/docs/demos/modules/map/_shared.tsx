import { useQuery } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import {
	fetchOsrmRoute,
	type LngLat,
	type MapGeography,
	MapMarker,
	MapRoute,
	type MapRouteResult,
} from '../../../../modules/map'
import { Example as ExampleFrame } from '../../../engine'

// Every map demo renders in the same fixed-width, resizable frame so its
// responsive behaviour is visible at a glance. Wrapping the engine Example once
// here injects those defaults into all the `<Example>` call sites in the tab
// pages — without repeating the props on each. A call site can still override
// either default by passing its own `width`/`resize`.
export function Example(props: ComponentProps<typeof ExampleFrame>) {
	return <ExampleFrame width={720} minWidth={480} resize {...props} />
}

// Atlas data stays out of the package (and the docs bundle): the demos fetch
// the TopoJSON from us-atlas as a static asset and cache it with react-query,
// standing a MapSkeleton in while it loads — the same shape a consumer's
// lazily-loaded geography takes.
//
// Fetching runs through react-query so a result outlives the tab that asked for
// it: switching away and back reads the cache instead of refetching, and a tab
// warms on hover before it opens (see `warm` in layout.tsx). The query
// definitions live in these factories so the render hooks and the preload
// prefetch key the same entry — the route a hover warms is the one the panel
// reads. The plat itself never fetches; this is the geocode → route → draw flow
// a consumer runs, and where they would point react-query at their own data.

/** The us-atlas TopoJSON, fetched once and cached (static, so it never restales). */
function geographyQuery(url: string) {
	return {
		queryKey: ['us-atlas', url] as const,
		queryFn: () => fetch(url).then((response) => response.json() as Promise<MapGeography>),
	}
}

/**
 * A road route between two coordinates from the OSRM demo server, cached per
 * pair. The public demo server is rate-limited and non-commercial; a real app
 * points `fetchOsrmRoute` at a self-hosted OSRM through its `baseUrl` option.
 * react-query supplies the abort signal, so a query dropped mid-flight cancels.
 * The route comes back at `fetchOsrmRoute`'s default `overview: 'simplified'`
 * detail — a fraction of the coordinates, sub-pixel-identical at this scale —
 * so the drawn overlay stays cheap on a cross-country leg.
 */
export function routeQuery(start: LngLat, end: LngLat) {
	return {
		queryKey: ['osrm-route', start, end] as const,
		queryFn: ({ signal }: { signal: AbortSignal }) => fetchOsrmRoute([start, end], { signal }),
	}
}

/** The atlas for the plats; `null` while it loads, so the frame holds its skeleton. */
export function useGeography(url: string): MapGeography | null {
	return useQuery(geographyQuery(url)).data ?? null
}

/**
 * The routed leg for an overlay; `null` while it loads or if routing fails, so
 * callers fall back to the straight line the overlay draws without a `path`.
 */
function useRoute(start: LngLat, end: LngLat): MapRouteResult | null {
	return useQuery(routeQuery(start, end)).data ?? null
}

/** Formats a routed distance in whole miles. */
function miles(meters: number): string {
	return `${Math.round(meters / 1609.344).toLocaleString()} mi`
}

// The routed overlays stay unmounted until the road route arrives — no
// straight-line fallback flashes first. Mounting once loaded lets the marks
// draw themselves in under the plat's `animate`.

/** A line-only route between two points, drawn on real roads once fetched. */
export function RoutedLine({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const route = useRoute(start, end)

	if (route === null) return null

	return <MapRoute label={label} path={route.path} detail={miles(route.distanceMeters)} />
}

/** An origin → destination marker whose connecting route follows the roads. */
export function RoutedMarker({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const route = useRoute(start, end)

	if (route === null) return null

	return (
		<MapMarker
			label={label}
			start={start}
			end={end}
			path={route.path}
			detail={miles(route.distanceMeters)}
		/>
	)
}
