import { BarChart } from 'ui/chart'
import { swings } from './data.ts'

export default function NegativeValues() {
	return (
		<BarChart
			aria-label="Month-over-month swing"
			data={swings}
			series={[{ xKey: 'month', yKey: 'delta', yName: 'Swing' }]}
			crosshair
		/>
	)
}
