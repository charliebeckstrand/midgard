import { Grid, type GridColumn } from 'ui/grid'
import { type Person, people, searchableColumns } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [
	{ id: 'select', selectable: true },
	...searchableColumns,
]

export default function SelectionSummary() {
	// The footer counts the rows that show. While a row is selected, it counts
	// the selected rows.
	return (
		<Grid
			columns={selectColumns}
			rows={people}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			search={{}}
			footer={{ rowTotal: true, selectedTotal: true }}
		/>
	)
}
