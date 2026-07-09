import { Stack } from '../../../../components/stack'
import { ComboChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example } from './_examples'
import { months } from './_fixtures'

type OperationsWeek = { week: string; shipments: number; exceptions: number }

// Two measures of different scale — volumes in the thousands, exceptions in the
// tens — the dual-axis case.
const operations: OperationsWeek[] = [
	{ week: 'W1', shipments: 1240, exceptions: 18 },
	{ week: 'W2', shipments: 1385, exceptions: 9 },
	{ week: 'W3', shipments: 1512, exceptions: 24 },
	{ week: 'W4', shipments: 1467, exceptions: 12 },
	{ week: 'W5', shipments: 1690, exceptions: 31 },
	{ week: 'W6', shipments: 1755, exceptions: 15 },
	{ week: 'W7', shipments: 1621, exceptions: 11 },
	{ week: 'W8', shipments: 1834, exceptions: 22 },
]

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Bar and line" code={code`<ComboChart crosshair={{ snap: true }} … />`}>
				<ComboChart
					aria-label="Revenue bars with margin line by month"
					data={months}
					series={[
						{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					crosshair={{ snap: true }}
				/>
			</Example>

			<Example
				title="Bar, area, and line"
				code={code`<ComboChart series={[{ type: 'bar' … }, { type: 'area' … }, { type: 'line' … }]} … />`}
			>
				<ComboChart
					aria-label="Revenue bars over a cost area with a margin line by month"
					data={months}
					series={[
						{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
						{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					crosshair={{ snap: true }}
				/>
			</Example>

			<Example
				title="Dual axis"
				code={code`<ComboChart rightAxis={{ title: 'Exceptions' }} series={[…, { …, axis: 'right' }]} … />`}
			>
				<ComboChart
					aria-label="Weekly shipments with exception counts"
					data={operations}
					series={[
						{ type: 'area', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
						{
							type: 'line',
							xKey: 'week',
							yKey: 'exceptions',
							yName: 'Exceptions',
							axis: 'right',
						},
					]}
					leftAxis={{ title: 'Shipments' }}
					rightAxis={{ title: 'Exceptions' }}
					crosshair={{ snap: true }}
				/>
			</Example>

			<AnimatedExample title="Animated" source={code`<ComboChart animate … />`}>
				<ComboChart
					aria-label="Revenue bars over a cost area with a margin line by month, animated"
					data={months}
					series={[
						{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
						{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
