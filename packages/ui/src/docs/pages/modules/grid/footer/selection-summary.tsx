import { useState } from 'react'
import { Grid } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function SelectionSummary() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [search, setSearch] = useState('')

	// The footer counts the rows that show. While a row is selected, it counts
	// the selected rows.
	return (
		<Grid
			columns={[{ id: 'select', selectable: true }, ...searchableColumns]}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: search, onValueChange: setSearch }}
			selection={{ value: selection, onValueChange: (next) => setSelection(next ?? new Set()) }}
			footer={{ rowTotal: true, selectedTotal: true }}
		/>
	)
}
