import { useState } from 'react'
import { Grid } from 'ui/grid'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

export default function PasteAndFill() {
	const [people, setPeople] = useState(initialPeople)

	// With `range`, the cursor holds a block of cells. A paste, a clear, a cut,
	// or a fill writes into the block through `onCommit`, as one save that one
	// undo takes back.
	return (
		<>
			<EditHelp label="Paste and fill help">
				<PointerHint
					mouseText="Select a range, then paste with Ctrl+V or Cmd+V, clear with Delete, cut with Ctrl+X or Cmd+X, or fill down with Ctrl+D or Cmd+D."
					touchText="Use a keyboard or a mouse to select a range and paste into it."
				/>
			</EditHelp>
			<Grid
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				range
				contextMenu={{ cell: true }}
				editable={{
					session: 'managed',
					scope: 'cell',
					history: true,
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
