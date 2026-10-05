import { type LngLat, MapGeofence, MapPlat, MapPoint, type MapSeriesColor } from 'ui/map'
import { states } from '../data.ts'

// The service radius around each depot, in meters across the ground.
const serviceAreas: {
	city: string
	at: LngLat
	radius: number
	color: MapSeriesColor
	detail: string
}[] = [
	{ city: 'Dallas', at: [-96.8, 32.78], radius: 240_000, color: 'blue', detail: 'Next day' },
	{ city: 'Chicago', at: [-87.63, 41.88], radius: 190_000, color: 'violet', detail: 'Next day' },
	{
		city: 'Los Angeles',
		at: [-118.24, 34.05],
		radius: 150_000,
		color: 'amber',
		detail: 'Same day',
	},
]

export default function DepotCatchments() {
	// Each area draws before its depot, so the dot is on top of the area. The
	// area and the depot share a group, so the legend shows one entry for each city.
	return (
		<MapPlat
			aria-label="Depot catchments"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{serviceAreas.map((area) => (
				<MapGeofence
					key={area.city}
					label={area.city}
					group={area.city}
					at={area.at}
					radius={area.radius}
					color={area.color}
					detail={area.detail}
				/>
			))}
			{serviceAreas.map((area) => (
				<MapPoint key={area.city} label={area.city} group={area.city} at={area.at} detail="Depot" />
			))}
		</MapPlat>
	)
}
