import { DonutChart } from 'ui/chart'
import { Stat, StatLabel, StatValue } from 'ui/stat'
import { sources } from '../data.ts'

export default function CenterContent() {
	return (
		<DonutChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits' }]}
		>
			<Stat>
				<StatLabel>Total visits</StatLabel>
				<StatValue>9,340</StatValue>
			</Stat>
		</DonutChart>
	)
}
