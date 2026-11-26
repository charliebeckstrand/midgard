import { Flag } from 'lucide-react'
import { useState } from 'react'
import { BarChart } from 'ui/chart'
import { months } from './data.ts'

// A function builds the items from the mark under the pointer, so an item can
// name the month that it acts on. With no mark under the pointer, the function
// gets `index: null` and gives no item. Right-click a bar, or touch and hold it.
export default function ContextMenuItems() {
	const [flagged, setFlagged] = useState<string>()

	return (
		<BarChart
			aria-label="Revenue by month"
			title="Revenue"
			subtitle={flagged ? `Flagged: ${flagged}` : 'No month flagged'}
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
	)
}
