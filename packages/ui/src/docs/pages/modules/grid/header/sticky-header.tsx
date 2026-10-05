import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function StickyHeader() {
	return (
		<Grid
			header={{ position: 'sticky' }}
			maxHeight="200px"
			columns={columns}
			rows={[...people, ...people]}
			getKey={(row, index) => `${row.id}-${index}`}
		/>
	)
}
