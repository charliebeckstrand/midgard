import { useState } from 'react'
import { Button } from 'ui/button'
import { LineChart } from 'ui/chart'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { months } from '../data.ts'

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
			<LineChart
				key={run}
				aria-label="Revenue and margin by month"
				data={months}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'month', yKey: 'margin', yName: 'Margin' },
				]}
				fill
				animate
			/>
		</Stack>
	)
}
