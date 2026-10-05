import { BarChart, type BarChartProps } from 'ui/chart'
import { type Month, months } from './data.ts'

export default function ChartPlayground(props: BarChartProps<Month>) {
	return (
		<BarChart
			{...props}
			aria-label="Revenue and costs by month"
			data={months}
			series={[
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
			]}
		/>
	)
}
