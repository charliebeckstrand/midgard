import { ChoroplethChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import states from 'us-atlas/states-10m.json'
import { stateLabel } from '../../../../data/us-states.ts'
import { customersByState, heat } from '../data.ts'

export default function Basic() {
	const { formatNumber } = useIntl()

	return (
		<ChoroplethChart
			aria-label="Customers by state"
			geography={states}
			projection="albers-usa"
			legend="range"
			data={customersByState}
			series={[
				{
					idKey: 'state',
					colorKey: 'customers',
					colorRange: heat,
					colorName: 'Customers',
				},
			]}
			regionId={(feature) => String(feature.properties?.name)}
			regionLabel={stateLabel}
			formatValue={(value) => formatNumber(value, { maximumFractionDigits: 0 })}
		/>
	)
}
