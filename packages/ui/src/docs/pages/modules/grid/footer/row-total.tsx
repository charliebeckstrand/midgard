import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function RowTotal() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'Row total' }}
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			footer={{ rowTotal: true }}
		/>
	)
}
