import { LineChart } from 'ui/chart'
import { monthNames } from '../../../../data/calendar.ts'
import { months } from '../data.ts'

export default function ReferencePanel() {
	return (
		<LineChart
			aria-label="Revenue and costs by month against targets"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			reference={[
				{ value: 60, label: 'Revenue target', color: 'green' },
				{ value: 32, label: 'Cost cap', color: 'red' },
				{ category: monthNames.apr, label: 'Price change', color: 'amber' },
			]}
			legend={{ placement: 'right', references: true }}
		/>
	)
}
