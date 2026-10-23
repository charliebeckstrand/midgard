import { useState } from 'react'
import { Grid, type GridColumnGroup } from 'ui/grid'
import { columns, people } from '../data.tsx'
import { columnGroups } from './data.tsx'

export default function GroupEditor() {
	const [groups, setGroups] = useState<GridColumnGroup[]>(columnGroups)

	// Controlled groups add the group editor to the column manager. With
	// `reorder`, drag a column to a group. The Move menu of a row also moves it.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnGroups={{ value: groups, onValueChange: setGroups }}
			columnManager={{ toolbar: true }}
			reorder
		/>
	)
}
