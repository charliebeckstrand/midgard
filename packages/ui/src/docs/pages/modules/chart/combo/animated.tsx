import { useState } from 'react'
import { Button } from 'ui/button'
import { ComboChart } from 'ui/chart'
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
			<ComboChart
				key={run}
				aria-label="Revenue, costs, and margin by month"
				data={months}
				series={[
					{ type: 'bar', xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ type: 'area', xKey: 'month', yKey: 'costs', yName: 'Costs' },
					{ type: 'line', xKey: 'month', yKey: 'margin', yName: 'Margin' },
				]}
				animate
			/>
		</Stack>
	)
}
