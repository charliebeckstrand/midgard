import { Grid, type GridColumn } from 'ui/grid'
import { type Employee, employeeColumns, employees } from '../data.tsx'

// Name is locked to the left. Status is pinned to the right, so a reader can
// release it.
const lockedColumns: GridColumn<Employee>[] = employeeColumns.map((column) => {
	return column.id === 'name' ? { ...column, pinned: undefined, locked: 'left' } : column
})

export default function LockedWithPinnableColumns() {
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
