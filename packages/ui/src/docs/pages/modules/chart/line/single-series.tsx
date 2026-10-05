import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function SingleSeries() {
	return (
		<LineChart
			aria-label="Revenue by month"
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
		/>
	)
}
