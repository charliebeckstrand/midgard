import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Grid, type GridColumn } from 'ui/grid'
import { IconButton } from 'ui/icon-button'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, type Person, personColumns } from './people.tsx'

// The button opens its row in a form, with one field for each column. On a
// wide screen the form is a sheet from the side, and on a phone it is a
// drawer. Shift+Enter on a cell also opens the form.
const columns: GridColumn<Person>[] = [
	...personColumns,
	{
		id: 'actions',
		actions: (_, { expand }) => (
			<IconButton color="blue" aria-label="Open row form" onClick={expand} icon={<Maximize2 />} />
		),
	},
]

export default function RowForm() {
	const [people, setPeople] = useState(initialPeople)

	return (
		<>
			<EditHelp label="Editing help">
				<PointerHint
					mouseText="Click the button of a row, or press Shift+Enter on a cell, to edit the row in a form."
					touchText="Tap the button at the end of a row to edit the row in a form."
				/>
			</EditHelp>
			<Grid
				tableProps={{ 'aria-label': 'Row form' }}
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				editable={{
					session: 'managed',
					scope: 'cell',
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
