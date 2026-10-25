import { useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { useTimeout } from 'ui/hooks'
import { useIntl } from 'ui/primitives/intl'
import { roles } from '../../../../data/people.ts'
import { columns, type Person, people } from '../data.tsx'

const sortableColumns: GridColumn<Person>[] = columns.map((column) =>
	column.id === 'status' ? column : { ...column, sortable: true },
)

// The text of each sortable column, as its cell shows it.
const sortText: Record<string, (row: Person) => string> = {
	name: (row) => row.name,
	email: (row) => row.email,
	role: (row) => roles[row.role],
}

// The work of the server: it sorts the rows by each column of the sort, in
// order. It compares the shown text in the locale of the reader, as the client
// sort of the grid does.
function sortPeople(sort: GridSortState[], locale: string): Person[] {
	const collator = new Intl.Collator(locale, { numeric: true })

	return people.toSorted((a, b) => {
		for (const { column, direction } of sort) {
			const text = sortText[column]

			const order = text ? collator.compare(text(a), text(b)) : 0

			if (order !== 0) return direction === 'asc' ? order : -order
		}

		return 0
	})
}

export default function ServerSideSorting() {
	const { locale } = useIntl()

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'name', direction: 'asc' }])

	const [rows, setRows] = useState(() => sortPeople(sort, locale))

	const timeout = useTimeout()

	// The timeout stands in for the request. The grid dims its rows until the
	// sorted rows arrive. Shift-click a header to sort by one more column.
	const onValueChange = (next: GridSortState[]) => {
		setSort(next)

		timeout.set(() => setRows(sortPeople(next, locale)), 600)
	}

	return (
		<Grid
			columns={sortableColumns}
			rows={rows}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange, manual: true }}
		/>
	)
}
