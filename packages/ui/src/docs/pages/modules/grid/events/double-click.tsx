import { Grid, type GridCellClickContext } from 'ui/grid'
import { JsonTree } from 'ui/json-tree'
import { Stack } from 'ui/stack'
import { columns, type Person, people } from '../data.tsx'
import { useClickInspector } from './click-inspector.ts'

type PickedCell = { event: string } & Omit<GridCellClickContext<Person>, 'value'> & {
		value: string
	}

export default function DoubleClick() {
	const { pick, tree } = useClickInspector<PickedCell>()

	// `onRowDoubleClick` gives the row, and `onCellDoubleClick` gives the same
	// context as `onCellClick`. A double click also fires each click handler twice.
	return (
		<Stack gap="md">
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				onCellDoubleClick={(cell) =>
					pick({ event: 'cellDoubleClick', ...cell, value: String(cell.value) })
				}
			/>
			<JsonTree {...tree} />
		</Stack>
	)
}
