import { useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { type Person, people, searchableColumns } from '../data.tsx'

const sortableColumns: GridColumn<Person>[] = searchableColumns.map((column) =>
	column.id === 'status' ? column : { ...column, sortable: true },
)

export default function ClientSorting() {
	// The grid sorts the rows itself by the `value` of each column. The sort
	// starts on two columns, so each sorted header shows its place in the sort.
	const [sort, setSort] = useState<GridSortState[]>([
		{ column: 'role', direction: 'asc' },
		{ column: 'name', direction: 'asc' },
	])

	return (
		<Grid
			columns={sortableColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}
