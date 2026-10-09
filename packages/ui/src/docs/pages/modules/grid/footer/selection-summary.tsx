import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { type Person, people, searchableColumns } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [
	{ id: 'select', selectable: true },
	...searchableColumns,
]

export default function SelectionSummary() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [search, setSearch] = useState('')

	// The footer counts the rows that show. While a row is selected, it counts
	// the selected rows.
	return (
		<Grid
			columns={selectColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: search, onValueChange: setSearch }}
			selection={{ value: selection, onValueChange: setSelection }}
			footer={{ rowTotal: true, selectedTotal: true }}
		/>
	)
}
