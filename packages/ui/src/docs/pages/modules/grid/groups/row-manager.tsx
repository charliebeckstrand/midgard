import { useState } from 'react'
import { Grid, type GridRowGroup } from 'ui/grid'
import { regions } from '../../../../data/commerce.ts'
import { sales, salesColumns } from './data.tsx'

export default function RowManager() {
	const [rowGroups, setRowGroups] = useState<GridRowGroup[]>([
		{ key: regions.west, color: 'blue' },
		{ key: regions.east, color: 'amber' },
	])

	// Right-click a group header and select "Manage rows" to color the groups,
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
