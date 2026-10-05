import { type LngLat, MapPlat, MapPoint } from 'ui/map'
import { states } from '../data.ts'

const warehouses: { city: string; at: LngLat; detail: string }[] = [
	{ city: 'Salt Lake City', at: [-111.89, 40.76], detail: '14 loads' },
	{ city: 'Los Angeles', at: [-118.24, 34.05], detail: '32 loads' },
	{ city: 'Dallas', at: [-96.8, 32.78], detail: '18 loads' },
	{ city: 'Chicago', at: [-87.63, 41.88], detail: '27 loads' },
	{ city: 'Atlanta', at: [-84.39, 33.75], detail: '11 loads' },
]

export default function Warehouses() {
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
					detail={warehouse.detail}
				/>
			))}
		</MapPlat>
	)
}
