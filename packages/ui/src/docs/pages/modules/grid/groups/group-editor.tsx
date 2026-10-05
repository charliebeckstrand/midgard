import { useState } from 'react'
import { Grid, type GridColumnGroup } from 'ui/grid'
import { columns, people } from '../data.tsx'
import { columnGroups } from './data.ts'

export default function GroupEditor() {
	const [groups, setGroups] = useState<GridColumnGroup[]>(columnGroups)

	// Controlled groups add the group editor to the column manager. Drag a
	// column to a group, or use the Move menu of its row.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnGroups={{ value: groups, onValueChange: setGroups }}
			columnManager={{ toolbar: true }}
		/>
	)
}
