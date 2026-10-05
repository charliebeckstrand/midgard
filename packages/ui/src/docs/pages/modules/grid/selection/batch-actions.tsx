import { useState } from 'react'
import { Button } from 'ui/button'
import { Grid } from 'ui/grid'
import { HoldButton } from 'ui/hold-button'
import { columns, people } from '../data.tsx'

export default function BatchActions() {
	const [rows, setRows] = useState(people)

	return (
		<>
			{rows.length === 0 && (
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
