import { useState } from 'react'
import { Button } from 'ui/button'
import { ScatterChart } from 'ui/chart'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { stops } from '../data.ts'

export default function Animated() {
	// The reveal plays when the chart mounts. Replay mounts it again.
	const [run, setRun] = useState(0)

	return (
		<Stack gap="sm">
			<Flex justify="end">
				<Button variant="outline" size="sm" onClick={() => setRun(run + 1)}>
					Replay
				</Button>
			</Flex>
			<ScatterChart
				key={run}
				aria-label="Dwell and handling time by stop distance"
				data={stops}
				series={[
					{ xKey: 'distance', yKey: 'dwell', yName: 'Dwell' },
					{ xKey: 'distance', yKey: 'handling', yName: 'Handling' },
				]}
				animate
			/>
		</Stack>
	)
}
