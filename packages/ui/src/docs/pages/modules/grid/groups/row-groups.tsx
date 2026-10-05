import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { columns, type Person, people } from '../data.tsx'

const sortableColumns: GridColumn<Person>[] = columns.map((column) =>
	column.id === 'status' ? column : { ...column, sortable: true },
)

export default function RowGroups() {
	const [groupBy, setGroupBy] = useState<string | number | null>('role')

	return (
		<Grid
			columns={sortableColumns}
			rows={people}
			getKey={(row) => row.id}
			groupBy={{ value: groupBy, onValueChange: setGroupBy }}
		/>
	)
}
