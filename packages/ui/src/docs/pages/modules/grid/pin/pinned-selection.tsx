import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { type Employee, employeeColumns, employees } from '../data.tsx'

const selectColumns: GridColumn<Employee>[] = [
	{ id: 'select', selectable: true },
	...employeeColumns,
]

export default function PinnedSelection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// The selection column stays at the left edge, before the pinned Name column.
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={selectColumns}
			rows={employees}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: setSelection }}
		/>
	)
}
