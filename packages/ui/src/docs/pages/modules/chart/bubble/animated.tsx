import { useState } from 'react'
import { Button } from 'ui/button'
import { BubbleChart } from 'ui/chart'
import { Flex } from 'ui/flex'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { stops } from '../data.ts'

export default function Animated() {
	// The reveal plays when the chart mounts. Replay mounts it again.
	const [run, setRun] = useState(0)

	const { formatNumber } = useIntl()

	return (
		<Stack gap="sm">
			<Flex justify="end">
				<Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
					Replay
				</Button>
			</Flex>
			<BubbleChart
				key={run}
				aria-label="Dwell time by stop distance and weight"
				data={stops}
				series={[
					{
						xKey: 'distance',
						yKey: 'dwell',
						sizeKey: 'weight',
						sizeName: 'Weight',
						yName: 'Dwell',
					},
				]}
				axes={{ x: { format: (value) => formatNumber(value, { style: 'unit', unit: 'mile' }) } }}
				animate
			/>
		</Stack>
	)
}
