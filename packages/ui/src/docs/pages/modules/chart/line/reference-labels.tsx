import { LineChart } from 'ui/chart'
import { months } from '../data.ts'

export default function ReferenceLabels() {
	return (
		<LineChart
			aria-label="Revenue by month against a target, with reference labels"
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			reference={[{ value: 60, label: 'Target', color: 'green' }]}
			labels={{ references: true }}
		/>
	)
}
