import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function CategoryDividers() {
	return (
		<LineChart
			aria-label="Revenue by month"
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			axes={{ x: { separator: 'dashed' } }}
		/>
	)
}
