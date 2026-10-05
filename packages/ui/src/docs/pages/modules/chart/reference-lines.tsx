import { BarChart } from 'ui/chart'
import { months } from './data.ts'

export default function ReferenceLines() {
	return (
		<BarChart
			aria-label="Revenue by month against a target and ceiling"
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			legend
			reference={[
				{ value: 55, label: 'Target', color: 'green' },
				{ value: 80, label: 'Ceiling', color: '#e11d48' },
			]}
		/>
	)
}
