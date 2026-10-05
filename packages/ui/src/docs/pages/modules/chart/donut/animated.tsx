import { DonutChart } from 'ui/chart'
import { sources } from '../data.ts'

export default function Animated() {
	return (
		<DonutChart
			aria-label="Traffic by source, animated"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits' }]}
			animate
		/>
	)
}
