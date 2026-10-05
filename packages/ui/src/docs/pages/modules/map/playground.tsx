import { MapPlat, type MapPlatCategoricalProps } from 'ui/map'
import { type StateZone, stateName, states, timezones, zoneCategories } from './data.ts'

export default function MapPlayground(props: MapPlatCategoricalProps<StateZone>) {
	return (
		<MapPlat
			{...props}
			aria-label="Timezones across America"
			geography={states}
			projection="albers-usa"
			data={timezones}
			regionKey="state"
			categoryKey="zone"
			categories={zoneCategories}
			regionId={stateName}
			animate
			legend="right"
		/>
	)
}
