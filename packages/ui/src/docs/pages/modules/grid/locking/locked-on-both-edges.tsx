import { Grid, type GridColumn } from 'ui/grid'
import { type Employee, employeeColumns, employees } from '../data.tsx'

// Name is locked to the left and Status to the right.
const lockedColumns: GridColumn<Employee>[] = employeeColumns.map((column) => {
	if (column.id === 'name') return { ...column, locked: 'left' }

	return column.id === 'status' ? { ...column, locked: 'right' } : column
})

export default function LockedOnBothEdges() {
	return (
		<Grid
			resizable
			columns={lockedColumns}
			rows={employees}
			getKey={(row) => row.id}
			columnManager={{ toolbar: true }}
		/>
	)
}
