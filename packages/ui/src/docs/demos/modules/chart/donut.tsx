import { Stack } from '../../../../components/stack'
import { Stat, StatLabel, StatValue } from '../../../../components/stat'
import { DonutChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example } from './_examples'
import { sources } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Basic" code={code`<DonutChart>`}>
				<DonutChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
				/>
			</Example>

			<Example title="Center content" code={code`<DonutChart>…</DonutChart>`}>
				<DonutChart
					aria-label="Traffic by source"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
				>
					<Stat>
						<StatLabel>Total visits</StatLabel>
						<StatValue>9,340</StatValue>
					</Stat>
				</DonutChart>
			</Example>

			<AnimatedExample title="Animated" source={code`<DonutChart animate … />`}>
				<DonutChart
					aria-label="Traffic by source, animated"
					data={sources}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
