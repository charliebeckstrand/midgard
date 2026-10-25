import { LineChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import { freight } from '../data.ts'

export default function DashedLine() {
	const { formatNumber } = useIntl()

	return (
		<LineChart
			aria-label="Freight rate and shipped weight by month"
			data={freight}
			series={[
				{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
				{ xKey: 'month', yKey: 'weight', yName: 'Weight', axis: 'y2', dashed: true },
			]}
			axes={{
				y: {
					title: 'Rate per lb',
					format: (value: number) => formatNumber(value, { style: 'currency', currency: 'USD' }),
				},
				y2: {
					title: 'Weight',
					format: (value: number) =>
						formatNumber(value, { style: 'unit', unit: 'pound', notation: 'compact' }),
				},
			}}
			points
		/>
	)
}
