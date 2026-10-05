import { LineChart } from 'ui/chart'
import { dailyVisits } from '../data.ts'

export default function TimeAxis() {
	return (
		<LineChart
			aria-label="Visits by day"
			data={dailyVisits}
			series={[{ xKey: 'date', yKey: 'visits', yName: 'Visits' }]}
			axes={{ x: { type: 'time' } }}
		/>
	)
}
