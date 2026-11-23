import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ResizableColumns() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'Resizable columns' }}
			resizable
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}
