import { LineChart } from 'ui/chart'
import { signups } from '../data.ts'

export default function DateLabels() {
	return (
		<LineChart
			aria-label="Signups per day, dates normalized to the locale's month/day order"
			data={signups}
			series={[{ xKey: 'day', yKey: 'count', yName: 'Signups' }]}
			points
		/>
	)
}
