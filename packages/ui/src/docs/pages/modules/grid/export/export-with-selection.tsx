import { useState } from 'react'
import { Grid } from 'ui/grid'
import { filterableColumns, people } from '../data.tsx'

export default function ExportWithSelection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// While rows are selected, an export takes only the selected rows.
	return (
		<Grid
			exportable={{ types: ['csv', 'excel'], toolbar: true }}
			columns={[{ id: 'select', selectable: true }, ...filterableColumns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (next) => setSelection(next ?? new Set()) }}
		/>
	)
}
