import { Stack } from '../../../../components/stack'
import { BarChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example, LegendPlacementExample } from './_examples'
import { months, sources, swings } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Grouped" code={code`<BarChart … />`}>
				<BarChart
					aria-label="Revenue and costs by month"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
				/>
			</Example>

			<Example title="Stacked" code={code`<BarChart stacked … />`}>
				<BarChart
					aria-label="Revenue and costs by month, stacked"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					stacked
				/>
			</Example>

			<Example title="Thick" code={code`<BarChart thick … />`}>
				<BarChart
					aria-label="Traffic by source, thick bars"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
					thick
				/>
			</Example>

			<Example title="Texture" code={code`<BarChart texture … />`}>
				<BarChart
					aria-label="Revenue and costs by month, textured"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					texture
				/>
			</Example>

			<Example title="Horizontal" code={code`<BarChart orientation="horizontal" … />`}>
				<BarChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
					orientation="horizontal"
				/>
			</Example>

			<Example title="Negative values" code={code`<BarChart crosshair … />`}>
				<BarChart
					aria-label="Month-over-month swing"
					data={swings}
					series={[{ xKey: 'month', yKey: 'delta', yName: 'Swing' }]}
					crosshair
				/>
			</Example>

			<Example
				title="Reference lines"
				code={code`<BarChart legend reference={[{ value: 55, label: 'Target', color: 'green' }, { value: 80, label: 'Ceiling', color: '#e11d48' }]} … />`}
			>
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
			</Example>

			<LegendPlacementExample>
				{(placement) => (
					<BarChart
						aria-label={`Revenue and costs by month, legend ${placement}`}
						data={months}
						series={[
							{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
							{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
						]}
						aspectRatio={16 / 9}
						legend={placement}
					/>
				)}
			</LegendPlacementExample>

			<AnimatedExample title="Animated" source={code`<BarChart animate … />`}>
				<BarChart
					aria-label="Revenue and costs by month, animated"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs', color: 'rose' },
					]}
					reference={[{ value: 55, label: 'Margin', color: 'amber' }]}
					animate
				/>
			</AnimatedExample>

			<Example title="Tooltip trigger" code={code`<BarChart tooltip={{ trigger: 'click' }} … />`}>
				<BarChart
					aria-label="Revenue and costs by month"
					data={months}
					series={[
						{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
						{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
					]}
					tooltip={{ trigger: 'click' }}
				/>
			</Example>

			<Example title="Title & subtitle" code={code`<BarChart title="…" subtitle="…" … />`}>
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
			</Example>
		</Stack>
	)
}
