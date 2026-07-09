import { Stack } from '../../../../components/stack'
import { HeatmapChart } from '../../../../modules/chart'
import { code } from '../../../engine'
import { activity, greens } from './_data'
import { Example } from './_examples'

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Activity"
				code={code`<HeatmapChart series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]} … />`}
			>
				<HeatmapChart
					aria-label="Commits by weekday and hour"
					data={activity}
					series={[
						{
							xKey: 'hour',
							yKey: 'day',
							colorKey: 'commits',
							colorRange: greens,
							colorName: 'Commits',
						},
					]}
					formatValue={(value) => value.toFixed(0)}
				/>
			</Example>
		</Stack>
	)
}
