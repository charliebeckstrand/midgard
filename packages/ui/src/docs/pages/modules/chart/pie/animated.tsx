import { useState } from 'react'
import { Button } from 'ui/button'
import { PieChart } from 'ui/chart'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { sources } from '../data.ts'

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
			<PieChart
				key={run}
				aria-label="Traffic by source"
				data={sources}
				series={[{ xKey: 'source', yKey: 'visits', yName: 'Visits' }]}
				animate
			/>
		</Stack>
	)
}
