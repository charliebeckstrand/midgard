import { Stack } from '../../../../components/stack'
import { ScatterChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { AnimatedExample, Example } from './_examples'
import { stops } from './_fixtures'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Multi-series" code={code`<ScatterChart crosshair={{ snap: true }} … />`}>
				<ScatterChart
					aria-label="Dwell and handling time against stop distance"
					data={stops}
					series={[
						{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
						{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
					]}
					formatXValue={(value) => `${value} mi`}
					crosshair={{ snap: true }}
				/>
			</Example>

			<AnimatedExample title="Animated" source={code`<ScatterChart animate … />`}>
				<ScatterChart
					aria-label="Dwell and handling time against stop distance, animated"
					data={stops}
					series={[
						{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
						{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
					]}
					animate
				/>
			</AnimatedExample>
		</Stack>
	)
}
