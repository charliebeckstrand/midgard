import { type LngLat, MapMarker, MapPlat } from 'ui/map'
import { miles, states } from '../data.ts'
import { ikeaDestinations, ikeaHub, useRoute } from '../routes.ts'

// A marker whose line follows the roads. It mounts when the road is in.
function RoutedMarker({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
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

export default function IkeaDistributionNetwork() {
	return (
		<MapPlat
			aria-label="IKEA distribution network"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{ikeaDestinations.map((destination) => (
				<RoutedMarker
					key={destination.abbreviation}
					label={`KC → ${destination.abbreviation}`}
					start={ikeaHub}
					end={destination.at}
				/>
			))}
		</MapPlat>
	)
}
