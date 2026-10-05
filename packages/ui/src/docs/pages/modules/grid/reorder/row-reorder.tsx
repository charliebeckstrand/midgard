import { useState } from 'react'
import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function RowReorder() {
	const [rows, setRows] = useState(people)

	// A `dragHandle` column holds the grip. `onReorder` gives the rows in their
	// new order.
	return (
		<Grid
			columns={[{ id: 'drag', dragHandle: true }, ...columns]}
			rows={rows}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			rowReorder={{ onReorder: setRows }}
		/>
	)
}
