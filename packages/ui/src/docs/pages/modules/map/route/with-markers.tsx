import { type LngLat, MapMarker, MapPlat } from 'ui/map'
import { useIntl } from 'ui/primitives/intl'
import { miles, states } from '../data.ts'
import { destinations, hub } from '../routes.ts'
import { useRoute } from '../use-route.ts'

// A marker whose line follows the roads. It mounts when the road is in.
function RoutedMarker({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const intl = useIntl()

	const route = useRoute(start, end)

	if (route === null) return null

	return (
		<MapMarker
			label={label}
			start={start}
			end={end}
			path={route.path}
			detail={miles(route.distanceMeters, intl)}
		/>
	)
}

export default function WithMarkers() {
	return (
		<MapPlat
			aria-label="Kansas City distribution network"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{destinations.map((destination) => (
				<RoutedMarker
					key={destination.abbreviation}
					label={`KC → ${destination.abbreviation}`}
					start={hub}
					end={destination.at}
				/>
			))}
		</MapPlat>
	)
}
