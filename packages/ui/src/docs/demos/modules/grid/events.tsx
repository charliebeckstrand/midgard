import { PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { JsonTree } from '../../../../components/json-tree'
import { Stack } from '../../../../components/stack'
import { Grid, type GridCellClickContext } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, type Person, people } from './_data'

const RowClickExample = () => {
	const [picked, setPicked] = useState<Person | null>(null)

	// A click on interactive cell content (here the row-action buttons) is ignored,
	// so the row click and per-row controls coexist. The rows are a roving-tabindex
	// group — Tab into the grid, then Up/Down between rows — and each activates on
	// Enter / Space. The tree below the grid inspects the clicked row's datum.
	return (
		<Stack gap="md">
			<Grid
				columns={[
					...columns,
					{
						id: 'actions',
						actions: () => (
							<Button variant="bare" color="blue">
								<Icon icon={<PencilIcon />} />
							</Button>
						),
					},
				]}
				rows={people}
				getKey={(row) => row.id}
				onRowClick={(row) => setPicked(row)}
			/>
			{picked && <JsonTree data={picked} />}
		</Stack>
	)
}

// The clicked cell's context, its `unknown` value stringified so the payload
// stays a JSON-serializable tree for the inspector below the grid.
type PickedCell = Omit<GridCellClickContext<Person>, 'value'> & { value: string }

const CellClickExample = () => {
	const [picked, setPicked] = useState<PickedCell | null>(null)

	// The cell context carries the column id and the cell's value alongside the
	// owning row; clicks on non-data cells are ignored. A cell handler makes the
	// data cells a roving-tabindex group — Tab into the grid, then arrow between
	// cells (Up/Down/Left/Right) and press Enter — the keyboard peer of the click.
	return (
		<Stack gap="md">
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				onCellClick={(cell) => setPicked({ ...cell, value: String(cell.value) })}
			/>
			{picked && <JsonTree data={picked} />}
		</Stack>
	)
}

const DoubleClickExample = () => {
	const [picked, setPicked] = useState<({ event: string } & PickedCell) | null>(null)

	// Double-click events layer over the single-click pair for a secondary
	// "open" affordance: `onRowDoubleClick` carries the row datum, and
	// `onCellDoubleClick` (shown here) the same context as `onCellClick`, fired
	// ahead of the row handler. Per the DOM's event order a double-click also
	// fires any single-click handlers twice first.
	return (
		<Stack gap="md">
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				onCellDoubleClick={(cell) =>
					setPicked({ event: 'cellDoubleClick', ...cell, value: String(cell.value) })
				}
			/>
			{picked && <JsonTree data={picked} />}
		</Stack>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Row click" code={code`<Grid onRowClick={(row) => ...} />`}>
				<RowClickExample />
			</Example>

			<Example
				title="Cell click"
				code={code`<Grid onCellClick={({ row, rowKey, columnId, value }) => ...} />`}
			>
				<CellClickExample />
			</Example>

			<Example
				title="Double click"
				code={code`<Grid onRowDoubleClick={(row) => ...} onCellDoubleClick={(cell) => ...} />`}
			>
				<DoubleClickExample />
			</Example>
		</Stack>
	)
}
