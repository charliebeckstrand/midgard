import { useState } from 'react'
import { Grid } from 'ui/grid'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

export default function PasteAndFill() {
	const [people, setPeople] = useState(initialPeople)

	// With `range`, the cursor holds a block of cells. A paste or a fill writes
	// into the block through `onCommit`, as one save that one undo takes back.
	return (
		<>
			<EditHelp label="Paste and fill help">
				Copy a block of cells from a spreadsheet, or from this grid with Ctrl+C or Cmd+C. Select
				cells with Shift and the arrow keys, or drag across them. Then press Ctrl+V or Cmd+V. One
				value fills the whole range. Press Ctrl+D or Cmd+D to fill down, and Ctrl+R or Cmd+R to fill
				right, or right-click the range. Press Ctrl+Z or Cmd+Z to undo.
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
					onCommit: (changes) => setPeople((current) => applyChanges(current, changes)),
				}}
			/>
		</>
	)
}
