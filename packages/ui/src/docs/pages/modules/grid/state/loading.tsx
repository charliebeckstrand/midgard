import { Grid } from 'ui/grid'
import { columns } from '../data.tsx'

export default function Loading() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'Loading' }}
			loading
			columns={columns}
			rows={[]}
			getKey={(row) => row.id}
		/>
	)
}
