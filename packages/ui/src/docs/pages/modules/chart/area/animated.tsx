import { AreaChart } from 'ui/chart'
import { months } from '../data.ts'

export default function Animated() {
	return (
		<AreaChart
			aria-label="Revenue and costs by month, stacked and animated"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			stacked
			animate
		/>
	)
}
