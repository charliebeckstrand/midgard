import { useState } from 'react'
import { Grid, type GridCellChange, type GridCellRefusal } from 'ui/grid'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

// The check of the mock server: it refuses an empty name and the name "Error".
function refuseNames(changes: GridCellChange[]): GridCellRefusal[] {
	return changes.flatMap((change) => {
		const name = String(change.value ?? '').trim()

		if (change.columnId !== 'name' || (name !== '' && name !== 'Error')) return []

		return [
			{
				rowKey: change.rowKey,
				columnId: change.columnId,
				error: name === '' ? 'A name is required' : 'Name refused',
			},
		]
	})
}

export default function AsyncCommit() {
	const [people, setPeople] = useState(initialPeople)

	// The cells of a save stay pending until the promise settles. The promise
	// gives the refused cells, and the grid keeps the value of a refused cell
	// as an edit, with the error under it.
	const onCommit = async (changes: GridCellChange[]) => {
		await new Promise((resolve) => setTimeout(resolve, 800))

		const refused = refuseNames(changes)

		const accepted = changes.filter(
			(change) =>
				!refused.some((cell) => cell.rowKey === change.rowKey && cell.columnId === change.columnId),
		)

		setPeople((current) => applyChanges(current, accepted))

		return refused
	}

	return (
		<>
			<EditHelp label="Async commit help">
				Each save takes a moment, as a save to a server does. While it runs, the cell pulses and
				cannot open. The save refuses an empty name and the name Error. A refused cell opens again
				with your value and the reason under it.
			</EditHelp>
			<Grid
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>
		</>
	)
}
