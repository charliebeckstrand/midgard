import { useState } from 'react'
import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ColumnReorderWithoutHandle() {
	const [order, setOrder] = useState<(string | number)[]>(['name', 'email', 'role', 'status'])

	// With no handle, the whole header moves its column. A sortable header
	// still sorts on a click.
	return (
		<Grid
			reorder={{ handle: false }}
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnOrder={{ value: order, onValueChange: setOrder }}
		/>
	)
}
