import { MapMarker, MapPlat } from 'ui/map'
import { useIntl } from 'ui/primitives/intl'
import { miles, states } from '../data.ts'
import { lineHaul } from '../routes.ts'
import { useRoute } from '../use-route.ts'

export default function Basic() {
	const intl = useIntl()

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
					detail={miles(route.distanceMeters, intl)}
				/>
			)}
		</MapPlat>
	)
}
