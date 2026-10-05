import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function Animated() {
	return (
		<LineChart
			aria-label="Revenue and margin by month, animated"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
			]}
			fill
			animate
		/>
	)
}
