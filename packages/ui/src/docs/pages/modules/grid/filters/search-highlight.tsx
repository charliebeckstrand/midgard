import { Grid } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function SearchHighlight() {
	// In `highlight` mode, the search marks each match and keeps each row.
	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{
				mode: 'highlight',
				placeholder: 'Search people',
			}}
		/>
	)
}
