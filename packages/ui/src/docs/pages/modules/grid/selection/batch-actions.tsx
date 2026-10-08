import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { HoldButton } from 'ui/hold-button'
import { ResetButton } from '../../../../kit/reset-button.tsx'
import { columns, type Person, people } from '../data.tsx'

const selectColumns: GridColumn<Person>[] = [{ id: 'select', selectable: true }, ...columns]

export default function BatchActions() {
	const [rows, setRows] = useState(people)

	return (
		<>
			{rows.length === 0 && <ResetButton onClick={() => setRows(people)} />}
			<Grid
				columns={selectColumns}
				rows={rows}
				getKey={(row) => row.id}
				selection={{
					batchActions: ({ selection, setSelection }) => (
						<HoldButton
							color="red"
							variant="soft"
							onHoldComplete={() => {
								setRows((current) => current.filter((row) => !selection.has(row.id)))

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
