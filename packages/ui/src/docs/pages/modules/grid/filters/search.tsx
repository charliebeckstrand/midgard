import { useState } from 'react'
import { Grid } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function Search() {
	const [query, setQuery] = useState('')

	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: query, onValueChange: setQuery, placeholder: 'Search people' }}
		/>
	)
}
