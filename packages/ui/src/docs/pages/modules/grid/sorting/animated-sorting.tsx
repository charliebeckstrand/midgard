import { useState } from 'react'
import { Grid, type GridSortState } from 'ui/grid'
import { people, searchableColumns } from '../data.tsx'

export default function AnimatedSorting() {
	const [sort, setSort] = useState<GridSortState[]>([{ column: 'name', direction: 'asc' }])

	// With `animate`, the rows move to their new places when the sort changes.
	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort, animate: true }}
		/>
	)
}
