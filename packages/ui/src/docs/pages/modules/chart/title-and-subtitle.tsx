import { BarChart } from 'ui/chart'
import { months } from './data.ts'

export default function TitleAndSubtitle() {
	return (
		<BarChart
			aria-label="Revenue and costs by month"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
			title="Revenue & costs"
			subtitle="Last six months"
		/>
	)
}
