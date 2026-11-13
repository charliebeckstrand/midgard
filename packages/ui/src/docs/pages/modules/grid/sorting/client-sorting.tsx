import { useState } from 'react'
import { Grid, type GridSortState } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function ClientSorting() {
	// The grid sorts the rows itself by the value of each column. The sort
	// starts on two columns, so each sorted header shows its place in the sort.
	const [sort, setSort] = useState<GridSortState[]>([
		{ column: 'role', direction: 'asc' },
		{ column: 'name', direction: 'asc' },
	])

	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}
