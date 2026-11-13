import { Grid, type GridColumn } from 'ui/grid'
import { type Employee, employeeColumns, employees } from '../data.tsx'

const selectColumns: GridColumn<Employee>[] = [
	{ id: 'select', selectable: true },
	...employeeColumns,
]

export default function PinnedSelection() {
	// The selection column stays at the left edge, before the pinned Name column.
	return (
		<Grid
			resizable
			columns={selectColumns}
			rows={employees}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
		/>
	)
}
