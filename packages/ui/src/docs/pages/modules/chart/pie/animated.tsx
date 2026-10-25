import { PieChart } from 'ui/chart'
import { sources } from '../data.ts'

export default function Animated() {
	return (
		<PieChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
			animate
		/>
	)
}
