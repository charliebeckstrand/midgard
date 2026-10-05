import { type LngLat, MapPlat, MapRoute } from 'ui/map'
import { miles, states } from '../data.ts'
import { corridors, useRoute } from '../routes.ts'

// A route that follows the roads. It mounts when the road is in.
function RoutedLine({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const route = useRoute(start, end)

	if (route === null) return null

	return <MapRoute label={label} path={route.path} detail={miles(route.distanceMeters)} />
}

export default function LongHaulCorridors() {
	return (
		<MapPlat
			aria-label="Long-haul corridors"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{corridors.map((corridor) => (
				<RoutedLine
					key={corridor.abbreviation}
					label={corridor.abbreviation}
					start={corridor.start}
					end={corridor.end}
				/>
			))}
		</MapPlat>
	)
}
