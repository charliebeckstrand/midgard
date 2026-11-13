import { Grid } from 'ui/grid'
import { columns, manyPeople } from '../data.tsx'

export default function StickyHeader() {
	return (
		<Grid
			header={{ position: 'sticky' }}
			maxHeight="200px"
			columns={columns}
			rows={manyPeople}
			getKey={(row) => row.id}
		/>
	)
}
