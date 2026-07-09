import { Stack } from '../../../../components/stack'
import { BubbleChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example } from './_examples'
import { stops } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Size encoding"
				code={code`<BubbleChart series={[{ …, sizeKey: 'weight' }]} … />`}
			>
				<BubbleChart
					aria-label="Dwell against distance, sized by weight"
					data={stops}
					series={[
						{
							xKey: 'distance',
							yKey: 'dwell',
							sizeKey: 'weight',
							sizeName: 'Weight',
							yName: 'Stops',
						},
					]}
					formatXValue={(value) => `${value} mi`}
				/>
			</Example>

			<AnimatedExample title="Animated" source={code`<BubbleChart animate … />`}>
				<BubbleChart
					aria-label="Dwell against distance, sized by weight, animated"
					data={stops}
					series={[
						{
							xKey: 'distance',
							yKey: 'dwell',
							sizeKey: 'weight',
							sizeName: 'Weight',
							yName: 'Stops',
						},
					]}
					formatXValue={(value) => `${value} mi`}
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
