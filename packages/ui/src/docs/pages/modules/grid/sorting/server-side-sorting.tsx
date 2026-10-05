import { useEffect, useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { columns, type Person, people } from '../data.tsx'

const sortableColumns: GridColumn<Person>[] = columns.map((column) =>
	column.id === 'status' ? column : { ...column, sortable: true },
)

// The work of the server: it sorts the rows by each column of the sort, in order.
function sortPeople(sort: GridSortState[]): Person[] {
	return people.toSorted((a, b) => {
		for (const { column, direction } of sort) {
			const key = column as keyof Person

			const order = direction === 'asc' ? 1 : -1

			if (a[key] < b[key]) return -order

			if (a[key] > b[key]) return order
		}

		return 0
	})
}

export default function ServerSideSorting() {
	const [sort, setSort] = useState<GridSortState[]>([{ column: 'name', direction: 'asc' }])

	const [rows, setRows] = useState(() => sortPeople(sort))

	// The timeout stands in for the request. The grid dims its rows until the
	// sorted rows arrive. Shift-click a header to sort by one more column.
	useEffect(() => {
		const id = setTimeout(() => setRows(sortPeople(sort)), 600)

		return () => clearTimeout(id)
	}, [sort])

	return (
		<Grid
			columns={sortableColumns}
			rows={rows}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort, manual: true }}
		/>
	)
}
