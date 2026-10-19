import { Grid } from 'ui/grid'
import { employeeColumns, employees } from '../data.tsx'

export default function PinnedColumns() {
	// Scroll the grid to the side: Name and Status stay in place.
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={employeeColumns}
			rows={employees}
			getKey={(row) => row.id}
		/>
	)
}
