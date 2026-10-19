import { ComboChart } from 'ui/chart'
import { months } from '../data.ts'

export default function BarAndLine() {
	return (
		<ComboChart
			aria-label="Revenue and margin by month"
			data={months}
			series={[
				{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
			]}
			crosshair={{ x: true, y: false }}
		/>
	)
}
