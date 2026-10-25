import { type LngLat, MapPlat, MapPoint } from 'ui/map'
import { states } from '../data.ts'

const warehouses: { city: string; at: LngLat; loads: number }[] = [
	{ city: 'Salt Lake City', at: [-111.89, 40.76], loads: 14 },
	{ city: 'Los Angeles', at: [-118.24, 34.05], loads: 32 },
	{ city: 'Dallas', at: [-96.8, 32.78], loads: 18 },
	{ city: 'Chicago', at: [-87.63, 41.88], loads: 27 },
	{ city: 'Atlanta', at: [-84.39, 33.75], loads: 11 },
]

export default function Basic() {
	return (
		<MapPlat
			aria-label="Warehouse network"
			geography={states}
			projection="albers-usa"
			animate
			legend="right"
		>
			{warehouses.map((warehouse) => (
				<MapPoint
					key={warehouse.city}
					label={warehouse.city}
					at={warehouse.at}
					detail={`${warehouse.loads} loads`}
				/>
			))}
		</MapPlat>
	)
}
