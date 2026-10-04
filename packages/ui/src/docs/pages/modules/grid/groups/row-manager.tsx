import { useState } from 'react'
import { Grid, type GridRowGroup } from 'ui/grid'
import { sales, salesColumns } from './data.ts'

export default function RowManager() {
	const [rowGroups, setRowGroups] = useState<GridRowGroup[]>([
		{ key: 'West', color: 'blue' },
		{ key: 'East', color: 'amber' },
	])

	// Right-click a group header and pick "Manage rows" to color the groups,
	// to put the groups in order, and to put the rows of a group in order.
	return (
		<Grid
			columns={salesColumns}
			rows={sales}
			getKey={(row) => row.id}
			rowLabel={(row) => row.rep}
			groupBy={{ value: 'region', rowGroups: { value: rowGroups, onValueChange: setRowGroups } }}
			groupTotalRow
		/>
	)
}
