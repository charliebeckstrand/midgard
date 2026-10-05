import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function CustomColors() {
	return (
		<LineChart
			aria-label="Revenue and margin by month, in custom colors"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: '#e11d48' },
				{ xKey: 'month', yKey: 'margin', yName: 'Margin', color: 'oklch(0.68 0.17 250)' },
			]}
		/>
	)
}
