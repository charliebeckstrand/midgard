import { ScatterChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import { stops } from '../data.ts'

export default function MultiSeries() {
	const { formatNumber } = useIntl()

	return (
		<ScatterChart
			aria-label="Dwell and handling time by stop distance"
			data={stops}
			series={[
				{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
				{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
			]}
			axes={{ x: { format: (value) => formatNumber(value, { style: 'unit', unit: 'mile' }) } }}
			crosshair
		/>
	)
}
