import { useState } from 'react'
import { Grid, type GridRowGroup } from 'ui/grid'
import { Text } from 'ui/text'
import { regions } from '../../../../data/commerce.ts'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { sales, salesColumns } from './data.tsx'

export default function RowManager() {
	const [rowGroups, setRowGroups] = useState<GridRowGroup[]>([
		{ key: regions.west, color: 'blue' },
		{ key: regions.east, color: 'amber' },
	])

	// The row manager colors the groups, puts the groups in order, and puts the
	// rows of a group in order.
	return (
		<>
			<Text tone="muted">
				<PointerHint
					mouseText="Right-click a group header and select Manage rows"
					touchText="Press and hold a group header and select Manage rows"
				/>
			</Text>
			<Grid
				columns={salesColumns}
				rows={sales}
				getKey={(row) => row.id}
				rowLabel={(row) => row.rep}
				groupBy={{ value: 'region', rowGroups: { value: rowGroups, onValueChange: setRowGroups } }}
				groupTotalRow
			/>
		</>
	)
}
