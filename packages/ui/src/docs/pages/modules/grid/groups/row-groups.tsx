import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function RowGroups() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'People' }}
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			groupBy={{ value: 'role' }}
		/>
	)
}
