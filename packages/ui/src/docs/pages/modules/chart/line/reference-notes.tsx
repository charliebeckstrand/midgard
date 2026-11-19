import { LineChart } from 'ui/chart'
import { monthNames } from '../../../../data/calendar.ts'
import { months } from '../data.ts'

export default function ReferenceNotes() {
	return (
		<LineChart
			aria-label="Revenue and costs by month against targets"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			reference={[
				{
					value: 60,
					label: 'Revenue target',
					color: 'green',
					description: 'The Q2 plan, set in January.',
				},
				{
					value: 32,
					label: 'Cost cap',
					color: 'red',
					description: 'The operating ceiling of the budget.',
				},
				{
					category: monthNames.apr,
					label: 'Price change',
					color: 'amber',
					description: 'The new pricing tiers shipped.',
				},
			]}
			legend={{ references: { variant: 'notes' } }}
		/>
	)
}
