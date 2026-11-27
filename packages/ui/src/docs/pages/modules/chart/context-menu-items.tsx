import { Flag } from 'lucide-react'
import { useState } from 'react'
import { BarChart } from 'ui/chart'
import { Text } from 'ui/text'
import { PointerHint } from '../../../kit/pointer-hint.tsx'
import { months } from './data.ts'

// A function builds the items from the mark under the pointer, so an item can
// name the month that it acts on. With no mark under the pointer, the function
// gets `index: null` and gives no item.
export default function ContextMenuItems() {
	const [flagged, setFlagged] = useState<string>()

	return (
		<>
			<Text tone="muted">
				<PointerHint mouseText="Right-click a bar" touchText="Press and hold a bar" />
			</Text>
			<BarChart
				aria-label="Revenue by month"
				title="Revenue"
				subtitle={flagged ? `Last action: Flag ${flagged}` : 'Last action: None'}
				data={months}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				contextMenu={{
					insert: 'before',
					items: ({ index, label }) =>
						index === null || label === null
							? []
							: [
									{
										key: 'flag',
										label: `Flag ${label}`,
										icon: <Flag />,
										onAction: () => setFlagged(label),
									},
								],
				}}
			/>
		</>
	)
}
