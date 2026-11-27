import { BarChart } from 'ui/chart'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { months } from './data.ts'

export default function TooltipTrigger() {
	return (
		<>
			<Text tone="muted">
				<PointerHint mouseText="Click a bar" touchText="Tap a bar" />
			</Text>
			<BarChart
				aria-label="Revenue and costs by month"
				data={months}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
				]}
				tooltip={{ trigger: 'click' }}
			/>
		</>
	)
}
