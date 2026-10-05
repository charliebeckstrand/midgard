import { useState } from 'react'
import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ColumnReorderWithHandle() {
	const [order, setOrder] = useState<(string | number)[]>(['name', 'email', 'role', 'status'])

	return (
		<Grid
			reorder
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnOrder={{ value: order, onValueChange: setOrder }}
		/>
	)
}
