import { Grid } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function Search() {
	return (
		<Grid
			tableProps={{ 'aria-label': 'People' }}
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{ placeholder: 'Search people' }}
		/>
	)
}
