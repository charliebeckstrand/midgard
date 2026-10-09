import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { filterableColumns, type Person, people } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [
	{ id: 'select', selectable: true },
	...filterableColumns,
]

export default function ExportWithSelection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// While rows are selected, an export takes only the selected rows.
	return (
		<Grid
			exportable={{ types: ['csv', 'excel'], toolbar: true }}
			columns={selectColumns}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: setSelection }}
		/>
	)
}
