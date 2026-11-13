import { Grid, type GridColumn } from 'ui/grid'
import { columns, type Person, people } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [{ id: 'select', selectable: true }, ...columns]

export default function Selection() {
	return (
		<Grid
			columns={selectColumns}
			rows={people}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
		/>
	)
}
