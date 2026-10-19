import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { columns, type Person, people } from '../data.tsx'

const dragColumns: GridColumn<Person>[] = [{ id: 'drag', dragHandle: true }, ...columns]

export default function RowReorder() {
	const [rows, setRows] = useState(people)

	// A `dragHandle` column holds the grip. `onReorder` gives the rows in their
	// new order.
	return (
		<Grid
			columns={dragColumns}
			rows={rows}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			rowReorder={{ onReorder: setRows }}
		/>
	)
}
