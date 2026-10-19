import { LineChart } from 'ui/chart'
import { signups } from '../data.ts'

export default function DateLabels() {
	return (
		<LineChart
			aria-label="Signups by day"
			data={signups}
			series={[{ xKey: 'day', yKey: 'count', yName: 'Signups' }]}
			points
		/>
	)
}
