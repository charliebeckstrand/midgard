import { type LngLat, MapPlat, MapPoint } from 'ui/map'
import { cities } from '../../../../data/places.ts'
import { states } from '../data.ts'

const warehouses: { city: string; at: LngLat; loads: number }[] = [
	{ city: cities.saltLakeCity, at: [-111.89, 40.76], loads: 14 },
	{ city: cities.losAngeles, at: [-118.24, 34.05], loads: 32 },
	{ city: cities.dallas, at: [-96.8, 32.78], loads: 18 },
	{ city: cities.chicago, at: [-87.63, 41.88], loads: 27 },
	{ city: cities.atlanta, at: [-84.39, 33.75], loads: 11 },
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
