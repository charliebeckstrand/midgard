import { useState } from 'react'
import { Grid } from 'ui/grid'
import { employeeColumns, employees } from '../data.tsx'

export default function PinnedSelection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// The selection column stays at the left edge, before the pinned Name column.
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={[{ id: 'select', selectable: true }, ...employeeColumns]}
			rows={employees}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (next) => setSelection(next ?? new Set()) }}
		/>
	)
}
