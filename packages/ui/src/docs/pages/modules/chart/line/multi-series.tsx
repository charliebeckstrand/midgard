import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function MultiSeries() {
	return (
		<LineChart
			aria-label="Revenue and margin by month"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			crosshair={{ x: false, y: true }}
		/>
	)
}
