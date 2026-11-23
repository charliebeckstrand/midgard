import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'
import { columnGroups } from './data.tsx'

export default function ColumnGroups() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'Column groups' }}
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnGroups={columnGroups}
		/>
	)
}
