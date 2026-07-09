import { Stack } from '../../../../components/stack'
import { PieChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example, LegendPlacementExample } from './_examples'
import { sources } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="No labels" code={code`<PieChart … />`}>
				<PieChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
				/>
			</Example>

			<Example title="Segment labels" code={code`<PieChart labels={{ segment: true }} … />`}>
				<PieChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					labels={{ segment: true }}
				/>
			</Example>

			<Example title="Callout labels" code={code`<PieChart labels={{ callouts: true }} … />`}>
				<PieChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					labels={{ callouts: true }}
				/>
			</Example>

			<LegendPlacementExample>
				{(placement) => (
					<PieChart
						aria-label={`Traffic by source, legend ${placement}`}
						data={sources}
						series={[{ xKey: 'source', yKey: 'visits' }]}
						legend={placement}
					/>
				)}
			</LegendPlacementExample>

			<AnimatedExample title="Animated" source={code`<PieChart animate … />`}>
				<PieChart
					aria-label="Traffic by source, animated"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
