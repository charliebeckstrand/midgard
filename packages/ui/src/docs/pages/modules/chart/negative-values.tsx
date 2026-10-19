import { BarChart } from 'ui/chart'
import { swings } from './data.ts'

export default function NegativeValues() {
	return (
		<BarChart
			aria-label="Revenue change by month"
			data={swings}
			series={[{ xKey: 'month', yKey: 'delta', yName: 'Change' }]}
			crosshair
		/>
	)
}
