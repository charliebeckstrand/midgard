import { ComboChart } from 'ui/chart'
import { months } from '../data.ts'

export default function BarAreaAndLine() {
	return (
		<ComboChart
			aria-label="Revenue bars over a cost area with a margin line by month"
			data={months}
			series={[
				{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
				{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
			]}
		/>
	)
}
