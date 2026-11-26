import { useState } from 'react'
import { BarChart } from 'ui/chart'
import { months } from './data.ts'

// A click, a tap, or Enter on a month toggles it in the selection. The marks of
// the other months recede while a selection is held.
export default function SelectACategory() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<BarChart
			aria-label="Revenue by month"
			title="Revenue"
			subtitle={selected.length > 0 ? `Selected: ${selected.join(', ')}` : 'No month selected'}
			data={months}
			series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
			selectedCategories={selected}
			onCategoryClick={(month) =>
				setSelected((prev) =>
					prev.includes(month) ? prev.filter((item) => item !== month) : [...prev, month],
				)
			}
		/>
	)
}
