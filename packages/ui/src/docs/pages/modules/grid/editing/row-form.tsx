import { Maximize2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { Grid, type GridColumn } from 'ui/grid'
import { Icon } from 'ui/icon'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, type Person, personColumns } from './people.tsx'

export default function RowForm() {
	const [people, setPeople] = useState(initialPeople)

	// The button opens its row in a form, with one field for each column. On a
	// wide screen the form is a sheet from the side, and on a phone it is a
	// drawer. Shift+Enter on a cell also opens the form.
	const columns = useMemo(
		(): GridColumn<Person>[] => [
			...personColumns,
			{
				id: 'actions',
				actions: (_, { expand }) => (
					<Button variant="bare" color="blue" aria-label="Open row form" onClick={expand}>
						<Icon icon={<Maximize2 />} />
					</Button>
				),
			},
		],
		[],
	)

	return (
		<>
			<EditHelp label="Editing help">
				<PointerHint
					mouseText="Click the button at the end of a row, or press Shift+Enter on a cell, to edit the row in a form."
					touchText="Tap the button at the end of a row to edit the row in a form."
				/>
			</EditHelp>
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				editable={{
					session: 'managed',
					scope: 'cell',
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
