import { type LngLat, MapPlat, MapRoute } from 'ui/map'
import { states } from '../data.ts'

const corridors: { abbreviation: string; stops: LngLat[] }[] = [
	{
		abbreviation: 'SF→NY',
		stops: [
			[-122.42, 37.77],
			[-74.0, 40.71],
		],
	},
	{
		abbreviation: 'LA→JAX',
		stops: [
			[-118.24, 34.05],
			[-81.66, 30.33],
		],
	},
]

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
				<MapRoute
					key={corridor.abbreviation}
					label={corridor.abbreviation}
					stops={corridor.stops}
				/>
			))}
		</MapPlat>
	)
}
