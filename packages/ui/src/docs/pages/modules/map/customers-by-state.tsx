import { MapPlat } from 'ui/map'
import { useIntl } from 'ui/primitives/intl'
import { stateLabel } from '../../../data/us-states.ts'
import { customersByState, heat } from '../chart/data.ts'
import { stateName, states } from './data.ts'

// A `valueKey` in place of a `categoryKey` colors each state by a number. The
// quantile binning puts the same count of states in each of the five bins, so the few large
// states do not take the whole scale.
export default function CustomersByState() {
	const { formatNumber } = useIntl()

	return (
		<MapPlat
			aria-label="Customers by state"
			geography={states}
			projection="albers-usa"
			data={customersByState}
			regionKey="state"
			valueKey="customers"
			colorRange={heat}
			bins={5}
			binning="quantile"
			colorName="Customers"
			regionId={stateName}
			regionLabel={stateLabel}
			formatValue={(value) => formatNumber(value, { maximumFractionDigits: 0 })}
			legend="right"
		/>
	)
}
