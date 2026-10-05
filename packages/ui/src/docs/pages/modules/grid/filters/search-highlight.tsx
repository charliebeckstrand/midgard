import { useState } from 'react'
import { Grid } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function SearchHighlight() {
	const [query, setQuery] = useState('')

	// In `highlight` mode, the search marks each match and keeps each row.
	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{
				value: query,
				onValueChange: setQuery,
				mode: 'highlight',
				placeholder: 'Highlight people',
			}}
		/>
	)
}
