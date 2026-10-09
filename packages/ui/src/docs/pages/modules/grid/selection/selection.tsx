import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { columns, type Person, people } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [{ id: 'select', selectable: true }, ...columns]

export default function Selection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<Grid
			columns={selectColumns}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: setSelection }}
		/>
	)
}
