import { Stack } from '../../../../components/stack'
import { AreaChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example } from './_examples'
import { months } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Single-series" code={code`<AreaChart … />`}>
				<AreaChart
					aria-label="Revenue by month"
					data={months}
					series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: 'orange' }]}
				/>
			</Example>

			<Example title="Stacked" code={code`<AreaChart stacked … />`}>
				<AreaChart
					aria-label="Revenue and costs by month, stacked"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					stacked
				/>
			</Example>

			<Example
				title="Smooth interpolation"
				code={code`<AreaChart interpolation="smooth" crosshair={{ x: false, y: true }} … />`}
			>
				<AreaChart
					aria-label="Revenue and margin by month"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
					]}
					interpolation="smooth"
					crosshair={{ x: false, y: true }}
				/>
			</Example>

			<AnimatedExample title="Animated" source={code`<AreaChart stacked animate … />`}>
				<AreaChart
					aria-label="Revenue and costs by month, stacked and animated"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					stacked
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
