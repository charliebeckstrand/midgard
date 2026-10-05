import { BarChart } from 'ui/chart'
import { months } from './data.ts'

export default function Animated() {
	return (
		<BarChart
			aria-label="Revenue and costs by month, animated"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs', color: 'rose' },
			]}
			reference={[{ value: 55, label: 'Margin', color: 'amber' }]}
			animate
		/>
	)
}
