import { MapPlat } from 'ui/map'
import { stateLabel } from '../../../data/us-states.ts'
import { splitTimezones, splitZoneCategories, stateName, states } from './data.ts'

export default function SplitTimeZones() {
	return (
		<MapPlat
			aria-label="US time zones, with the states that two zones split"
			geography={states}
			projection="albers-usa"
			data={splitTimezones}
			regionKey="state"
			categoryKey="zone"
			colorName="Time zone"
			categories={splitZoneCategories}
			regionId={stateName}
			regionLabel={stateLabel}
			legend="right"
		/>
	)
}
