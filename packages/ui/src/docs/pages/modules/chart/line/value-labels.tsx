import { LineChart } from 'ui/chart'
import { swings } from '../data.ts'

export default function ValueLabels() {
	return (
		<LineChart
			aria-label="Revenue change by month"
			data={swings}
			series={[{ xKey: 'month', yKey: 'delta', yName: 'Change' }]}
			points
			labels={{ endpoints: true, extremes: true }}
		/>
	)
}
