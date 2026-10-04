import { useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { type Person, people, searchableColumns } from '../data.tsx'

const sortableColumns: GridColumn<Person>[] = searchableColumns.map((column) =>
	column.id === 'status' ? column : { ...column, sortable: true },
)

export default function AnimatedSorting() {
	const [sort, setSort] = useState<GridSortState[]>([{ column: 'name', direction: 'asc' }])

	// With `animate`, the rows move to their new places when the sort changes.
	return (
		<Grid
			columns={sortableColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort, animate: true }}
		/>
	)
}
