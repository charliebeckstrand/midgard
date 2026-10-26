import { BubbleChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import { stops } from '../data.ts'

export default function Animated() {
	const { formatNumber } = useIntl()

	return (
		<BubbleChart
			aria-label="Dwell time by stop distance and weight"
			data={stops}
			series={[
				{
					xKey: 'distance',
					yKey: 'dwell',
					sizeKey: 'weight',
					sizeName: 'Weight',
					yName: 'Dwell',
				},
			]}
			axes={{ x: { format: (value) => formatNumber(value, { style: 'unit', unit: 'mile' }) } }}
			animate
		/>
	)
}
