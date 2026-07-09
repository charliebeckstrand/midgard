import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { Stack } from '../../../../components/stack'
import { TabList } from '../../../../components/tabs'
import type { LngLat } from '../../../../modules/map'
import { DemoTab, DemoTabPanel, DemoTabs } from '../../../engine'
import { corridors, ikeaDestinations, ikeaHub, laToChicago } from './_data'
import { routeQuery } from './_shared'

export function Layout({ children }: { children: ReactNode }) {
	// A client scoped to the demo and living in the layout, which persists across
	// tab routes, so a route fetched in one tab survives a switch away and back.
	// The data is static, so nothing restales, focus never refetches, and a failed
	// OSRM call doesn't retry-storm the rate-limited demo server.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: Number.POSITIVE_INFINITY,
						retry: false,
						refetchOnWindowFocus: false,
					},
				},
			}),
	)

	// Warm a tab's routes on hover or focus of its trigger, before the click: the
	// overlays then draw from cache instead of a fresh OSRM round trip. `DemoTab`
	// reserves `onPreload` for the tab's own chunk, so the warm rides the pointer
	// and focus events; against the warm cache a repeat `prefetchQuery` is a no-op.
	const warm = (pairs: readonly { start: LngLat; end: LngLat }[]) => {
		for (const pair of pairs) void queryClient.prefetchQuery(routeQuery(pair.start, pair.end))
	}

	const warmMarker = () => warm([laToChicago])

	const warmRoute = () =>
		warm([
			...ikeaDestinations.map((destination) => ({ start: ikeaHub, end: destination.at })),
			...corridors.map((corridor) => ({ start: corridor.start, end: corridor.end })),
		])

	return (
		<QueryClientProvider client={queryClient}>
			<DemoTabs>
				<Stack gap="lg">
					<TabList aria-label="Map feature">
						<DemoTab to="">Plat</DemoTab>
						<DemoTab to="point">Point</DemoTab>
						<DemoTab to="marker" onPointerEnter={warmMarker} onFocus={warmMarker}>
							Marker
						</DemoTab>
						<DemoTab to="route" onPointerEnter={warmRoute} onFocus={warmRoute}>
							Route
						</DemoTab>
					</TabList>

					<DemoTabPanel>{children}</DemoTabPanel>
				</Stack>
			</DemoTabs>
		</QueryClientProvider>
	)
}
