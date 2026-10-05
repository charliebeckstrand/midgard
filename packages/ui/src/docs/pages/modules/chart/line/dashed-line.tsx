import { LineChart } from 'ui/chart'
import { freight } from '../data.ts'

export default function DashedLine() {
	return (
		<LineChart
			aria-label="Rate per pound against shipped weight by month, the weight line dashed"
			data={freight}
			series={[
				{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
				{ xKey: 'month', yKey: 'weight', yName: 'Weight', axis: 'y2', dashed: true },
			]}
			axes={{
				y: { title: '$ / lb', format: (value: number) => `$${value.toFixed(2)}` },
				y2: { title: 'Weight', format: (value: number) => `${value}k lb` },
			}}
			points
		/>
	)
}
