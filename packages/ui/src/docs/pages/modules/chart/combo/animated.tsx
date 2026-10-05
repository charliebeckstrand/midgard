import { ComboChart } from 'ui/chart'
import { months } from '../data.ts'

export default function Animated() {
	return (
		<ComboChart
			aria-label="Revenue bars over a cost area with a margin line by month, animated"
			data={months}
			series={[
				{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
				{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
			]}
			animate
		/>
	)
}
