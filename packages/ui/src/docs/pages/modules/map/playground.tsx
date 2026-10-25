import { MapPlat, type MapPlatCategoricalProps } from 'ui/map'
import { stateLabel } from '../../../data/us-states.ts'
import { type StateZone, stateName, states, timezones, zoneCategories } from './data.ts'

export default function MapPlayground(props: MapPlatCategoricalProps<StateZone>) {
	return (
		<MapPlat
			{...props}
			aria-label="US time zones"
			geography={states}
			projection="albers-usa"
			data={timezones}
			regionKey="state"
			categoryKey="zone"
			colorName="Time zone"
			categories={zoneCategories}
			regionId={stateName}
			regionLabel={stateLabel}
			animate
			legend="right"
		/>
	)
}
