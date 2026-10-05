import { MapPlat, type MapPlatProps } from 'ui/map'
import { type StateZone, stateName, states, timezones, zoneCategories } from './data.ts'

// The props of a map that colors each region by a category.
type CategoryMapProps = Extract<MapPlatProps<StateZone>, { categoryKey: string }>

export default function MapPlayground(props: CategoryMapProps) {
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
