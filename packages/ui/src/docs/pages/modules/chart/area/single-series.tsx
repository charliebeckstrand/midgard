import { AreaChart } from 'ui/chart'
import { months } from '../data.ts'

export default function SingleSeries() {
	return (
		<AreaChart
			aria-label="Revenue by month"
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: 'orange' }]}
		/>
	)
}
