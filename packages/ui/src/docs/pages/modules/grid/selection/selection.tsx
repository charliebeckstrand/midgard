import { useState } from 'react'
import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function Selection() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<Grid
			columns={[{ id: 'select', selectable: true }, ...columns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (next) => setSelection(next ?? new Set()) }}
		/>
	)
}
