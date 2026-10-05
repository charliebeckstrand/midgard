import { DonutChart } from 'ui/chart'
import { sources } from '../data.ts'

export default function Basic() {
	return (
		<DonutChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits' }]}
		/>
	)
}
