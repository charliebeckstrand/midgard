import { Grid, type GridColumn } from 'ui/grid'
import { type Employee, employeeColumns, employees } from '../data.tsx'

// A locked column stays at its edge, and no control releases it. Name is
// locked to the left, and no other column is pinned.
const lockedColumns: GridColumn<Employee>[] = employeeColumns.map((column) => {
	if (column.id === 'name') return { ...column, pinned: undefined, locked: 'left' }

	return column.id === 'status' ? { ...column, pinned: undefined } : column
})

export default function LockedLeft() {
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={lockedColumns}
			rows={employees}
			getKey={(row) => row.id}
			columnManager={{ toolbar: true }}
		/>
	)
}
