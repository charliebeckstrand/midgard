import { type LngLat, MapMarker, MapPlat } from 'ui/map'
import { states } from '../data.ts'

const losAngeles: LngLat = [-118.24, 34.05]

const chicago: LngLat = [-87.63, 41.88]

export default function LineHaul() {
	return (
		<MapPlat
			aria-label="Line haul"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapMarker label="LA → CHI" start={losAngeles} end={chicago} />
		</MapPlat>
	)
}
