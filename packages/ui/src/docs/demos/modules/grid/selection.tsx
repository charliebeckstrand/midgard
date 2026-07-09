import { useState } from 'react'
import { Button } from '../../../../components/button'
import { HoldButton } from '../../../../components/hold-button'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

const SelectionExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<Grid
			columns={[{ id: 'select', selectable: true }, ...columns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

const BatchActionsExample = () => {
	const [rows, setRows] = useState(people)

	return (
		<>
			{!rows.length && (
				<Button color="red" variant="soft" onClick={() => setRows(people)}>
					Reset
				</Button>
			)}

			<Grid
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={(row) => row.id}
				selection={{
					batchActions: ({ selection, setSelection }) => (
						<HoldButton
							color="red"
							variant="soft"
							onComplete={() => {
								setRows((prev) => prev.filter((row) => !selection.has(row.id)))

								setSelection(new Set())
							}}
						>
							Delete {selection.size} items
						</HoldButton>
					),
				}}
			/>
		</>
	)
}

const ContextMenuExample = () => (
	// Context menus are on by default. Right-click a header for sort controls,
	// "Clear sort" (once the column is sorted), pin controls (Pin left / Pin right
	// / Unpin), and "Manage columns" (which opens the manager without a toolbar
	// button); right-click a body cell for "Copy". Hold Ctrl while right-clicking
	// for the browser's standard menu. Pass `contextMenu={false}` to disable, or a
	// builder to reshape the items.
	<Grid columns={columns} rows={people} getKey={(row) => row.id} />
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Selection">
				<SelectionExample />
			</Example>

			<Example title="Batch actions">
				<BatchActionsExample />
			</Example>

			<Example
				title="Context menus"
				code={code`<Grid contextMenu={{ column: true, cell: true }} />`}
			>
				<ContextMenuExample />
			</Example>
		</Stack>
	)
}
