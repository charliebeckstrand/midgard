import { PencilIcon } from 'lucide-react'
import { Button } from 'ui/button'
import { Grid, type GridColumn } from 'ui/grid'
import { Icon } from 'ui/icon'
import { JsonTree } from 'ui/json-tree'
import { Stack } from 'ui/stack'
import { columns, type Person, people } from '../data.tsx'
import { useClickInspector } from './click-inspector.ts'

const actionColumns: GridColumn<Person>[] = [
	...columns,
	{
		id: 'actions',
		actions: (row) => (
			<Button variant="bare" color="blue" aria-label={`Edit ${row.name}`}>
				<Icon icon={<PencilIcon />} />
			</Button>
		),
	},
]

export default function RowClick() {
	const { pick, tree } = useClickInspector<Person>()

	// A click on a control in a cell, such as the edit button, is not a row
	// click. Tab into the grid, move with the arrow keys, and press Enter or
	// Space to click a row.
	return (
		<Stack gap="md">
			<Grid columns={actionColumns} rows={people} getKey={(row) => row.id} onRowClick={pick} />
			<JsonTree {...tree} />
		</Stack>
	)
}
