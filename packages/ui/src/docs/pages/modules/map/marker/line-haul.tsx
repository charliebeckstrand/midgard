import { MapMarker, MapPlat } from 'ui/map'
import { miles, states } from '../data.ts'
import { lineHaul, useRoute } from '../routes.ts'

export default function LineHaul() {
	const route = useRoute(lineHaul.start, lineHaul.end)

	return (
		<MapPlat
			aria-label="Line haul"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{route && (
				<MapMarker
					label="LA → CHI"
					start={lineHaul.start}
					end={lineHaul.end}
					path={route.path}
					detail={miles(route.distanceMeters)}
				/>
			)}
		</MapPlat>
	)
}
