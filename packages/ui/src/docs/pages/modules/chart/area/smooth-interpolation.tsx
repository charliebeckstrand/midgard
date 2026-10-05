import { AreaChart } from 'ui/chart'
import { months } from '../data.ts'

export default function SmoothInterpolation() {
	return (
		<AreaChart
			aria-label="Revenue and margin by month"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
			]}
			interpolation="smooth"
			crosshair={{ x: false, y: true }}
		/>
	)
}
