import { useState } from 'react'
import { Button } from 'ui/button'
import { BarChart } from 'ui/chart'
import { Flex } from 'ui/flex'
import { Stack } from 'ui/stack'
import { months } from './data.ts'

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
			<BarChart
				key={run}
				aria-label="Revenue and costs by month"
				data={months}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'month', yKey: 'costs', yName: 'Costs', color: 'rose' },
				]}
				reference={[{ value: 55, label: 'Target', color: 'amber' }]}
				animate
			/>
		</Stack>
	)
}
