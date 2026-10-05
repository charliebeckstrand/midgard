import { Grid, type GridCellClickContext } from 'ui/grid'
import { JsonTree } from 'ui/json-tree'
import { Stack } from 'ui/stack'
import { columns, type Person, people } from '../data.tsx'
import { useClickInspector } from './click-inspector.ts'

type PickedCell = Omit<GridCellClickContext<Person>, 'value'> & { value: string }

export default function CellClick() {
	const { pick, tree } = useClickInspector<PickedCell>()

	// The context of a cell gives its row, its column, and its value. Tab into
	// the grid, move with the arrow keys, and press Enter to click a cell.
	return (
		<Stack gap="md">
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				onCellClick={(cell) => pick({ ...cell, value: String(cell.value) })}
			/>
			<JsonTree {...tree} />
		</Stack>
	)
}
