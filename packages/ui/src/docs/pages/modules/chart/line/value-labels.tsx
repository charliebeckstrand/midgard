import { LineChart } from 'ui/chart'
import { swings } from '../data.ts'

export default function ValueLabels() {
	return (
		<LineChart
			aria-label="Monthly change, with value labels at its endpoints and extremes"
			data={swings}
			series={[{ xKey: 'month', yKey: 'delta', yName: 'Change' }]}
			points
			labels={{ endpoints: true, extremes: true }}
		/>
	)
}
