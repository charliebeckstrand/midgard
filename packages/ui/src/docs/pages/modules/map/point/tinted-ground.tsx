import { type LngLat, type MapCategory, MapPlat, MapPoint } from 'ui/map'
import { cities } from '../../../../data/places.ts'
import { stateLabel } from '../../../../data/us-states.ts'
import { stateName, states, timezones, zoneCategories } from '../data.ts'

const warehouses: { city: string; at: LngLat; loads: number }[] = [
	{ city: cities.saltLakeCity, at: [-111.89, 40.76], loads: 14 },
	{ city: cities.losAngeles, at: [-118.24, 34.05], loads: 32 },
	{ city: cities.dallas, at: [-96.8, 32.78], loads: 18 },
	{ city: cities.chicago, at: [-87.63, 41.88], loads: 27 },
	{ city: cities.atlanta, at: [-84.39, 33.75], loads: 11 },
]

// The tint holds each zone back, so the states read as ground and the dots
// carry the values.
const tintedZones: MapCategory[] = zoneCategories.map((category) => ({
	...category,
	tone: 'tint',
}))

export default function TintedGround() {
	return (
		<MapPlat
			aria-label="Warehouses by time zone"
			geography={states}
			projection="albers-usa"
			data={timezones}
			regionKey="state"
			categoryKey="zone"
			colorName="Time zone"
			categories={tintedZones}
			regionId={stateName}
			regionLabel={stateLabel}
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
