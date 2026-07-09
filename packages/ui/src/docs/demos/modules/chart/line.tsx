import { Stack } from '../../../../components/stack'
import { LineChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { dailyVisits } from './_data'
import { AnimatedExample, Example } from './_examples'
import { months, swings } from './_fixtures'

type FreightMonth = { month: string; rate: number; weight: number }

// Rate per pound against shipped weight — a currency beside a quantity.
const freight: FreightMonth[] = [
	{ month: 'Jan', rate: 1.42, weight: 380 },
	{ month: 'Feb', rate: 1.51, weight: 415 },
	{ month: 'Mar', rate: 1.38, weight: 462 },
	{ month: 'Apr', rate: 1.66, weight: 448 },
	{ month: 'May', rate: 1.72, weight: 530 },
	{ month: 'Jun', rate: 1.58, weight: 585 },
]

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Single-series" code={code`<LineChart … />`}>
				<LineChart
					aria-label="Revenue by month"
					data={months}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				/>
			</Example>

			<Example title="Multi-series" code={code`<LineChart crosshair={{ snap: true }} … />`}>
				<LineChart
					aria-label="Revenue and margin by month"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					crosshair={{ snap: true }}
				/>
			</Example>

			<Example
				title="Custom colours"
				code={code`<LineChart series={[{ …, color: '#e11d48' }, { …, color: 'oklch(0.68 0.17 250)' }]} … />`}
			>
				<LineChart
					aria-label="Revenue and margin by month, in custom colours"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: '#e11d48' },
						{
							xKey: 'month',
							yKey: 'margin',
							yName: 'Margin',
							color: 'oklch(0.68 0.17 250)',
						},
					]}
				/>
			</Example>

			<Example
				title="Dual axis"
				code={code`<LineChart leftAxis={{ format: … }} rightAxis={{ format: … }} series={[…, { …, axis: 'right' }]} … />`}
			>
				<LineChart
					aria-label="Rate per pound against shipped weight by month"
					data={freight}
					series={[
						{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
						{ xKey: 'month', yKey: 'weight', yName: 'Weight', axis: 'right' },
					]}
					leftAxis={{ title: '$ / lb', format: (value) => `$${value.toFixed(2)}` }}
					rightAxis={{ title: 'Weight', format: (value) => `${value}k lb` }}
					crosshair={{ snap: true }}
				/>
			</Example>

			<Example
				title="Dashed line"
				code={code`<LineChart series={[{ … }, { …, axis: 'right', dashed: true }]} … />`}
			>
				<LineChart
					aria-label="Rate per pound against shipped weight by month, the weight line dashed"
					data={freight}
					series={[
						{ xKey: 'month', yKey: 'rate', yName: 'Rate' },
						{
							xKey: 'month',
							yKey: 'weight',
							yName: 'Weight',
							axis: 'right',
							dashed: true,
						},
					]}
					leftAxis={{ title: '$ / lb', format: (value) => `$${value.toFixed(2)}` }}
					rightAxis={{ title: 'Weight', format: (value) => `${value}k lb` }}
					points
					crosshair={{ snap: true }}
				/>
			</Example>

			<Example title="Time axis" code={code`<LineChart xAxis="time" … />`}>
				<LineChart
					aria-label="Visits by day"
					data={dailyVisits}
					series={[{ xKey: 'date', yKey: 'visits', yName: 'Visits' }]}
					xAxis="time"
				/>
			</Example>

			<Example title="Points" code={code`<LineChart points … />`}>
				<LineChart
					aria-label="Revenue by month"
					data={months}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
					points
				/>
			</Example>

			<Example
				title="Value labels"
				code={code`<LineChart labels={{ endpoints: true, extremes: true }} … />`}
			>
				{/* Point labels are single-series only: a lone line has room to name
				    its endpoints and extremes without crowding a neighbour. */}
				<LineChart
					aria-label="Monthly change, with value labels at its endpoints and extremes"
					data={swings}
					series={[{ xKey: 'month', yKey: 'delta', yName: 'Change' }]}
					points
					labels={{ endpoints: true, extremes: true }}
				/>
			</Example>

			<Example
				title="Reference labels"
				code={code`<LineChart reference={[{ value: 60, label: 'Target', color: 'green' }]} labels={{ references: true }} … />`}
			>
				<LineChart
					aria-label="Revenue by month against a target, with reference labels"
					data={months}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
					reference={[{ value: 60, label: 'Target', color: 'green' }]}
					labels={{ references: true }}
				/>
			</Example>

			<Example title="Smooth interpolation" code={code`<LineChart interpolation="smooth" … />`}>
				<LineChart
					aria-label="Revenue and margin by month, smoothed"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					interpolation="smooth"
				/>
			</Example>

			<Example title="Fill" code={code`<LineChart fill … />`}>
				<LineChart
					aria-label="Revenue by month"
					data={months}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
					fill
				/>
			</Example>

			<AnimatedExample title="Animated" source={code`<LineChart animate … />`}>
				<LineChart
					aria-label="Revenue and margin by month, animated"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					fill
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
