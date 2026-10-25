import { DonutChart } from 'ui/chart'
import { useIntl } from 'ui/primitives/intl'
import { Stat, StatLabel, StatValue } from 'ui/stat'
import { sources } from '../data.ts'

const total = sources.reduce((sum, source) => sum + source.visits, 0)

export default function CenterContent() {
	const { formatNumber } = useIntl()

	return (
		<DonutChart
			aria-label="Traffic by source"
			data={sources}
			series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
		>
			<Stat>
				<StatLabel>Total visits</StatLabel>
				<StatValue>{formatNumber(total)}</StatValue>
			</Stat>
		</DonutChart>
	)
}
