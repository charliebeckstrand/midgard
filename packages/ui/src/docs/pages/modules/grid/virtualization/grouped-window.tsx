import { Grid } from 'ui/grid'
import { columns, manyPeople } from '../data.tsx'

export default function GroupedWindow() {
	// The window holds the group headers and the rows as one list.
	// A row out of the window unmounts.
	return (
		<Grid
			columns={columns}
			rows={manyPeople}
			getKey={(row) => row.id}
			groupBy={{ value: 'role' }}
			header={{ position: 'sticky' }}
			virtualize
			maxHeight="320px"
		/>
	)
}
