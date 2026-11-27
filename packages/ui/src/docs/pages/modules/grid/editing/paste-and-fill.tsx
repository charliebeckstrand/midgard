import { useState } from 'react'
import { Grid } from 'ui/grid'
import { Kbd } from 'ui/kbd'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { ShortcutHint } from '../../../../kit/shortcut-hint.tsx'
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
					mouseText={
						<>
							Select a range, then paste with{' '}
							<Kbd>
								<ShortcutHint keyName="V" />
							</Kbd>
							, clear with Delete, cut with{' '}
							<Kbd>
								<ShortcutHint keyName="X" />
							</Kbd>
							, or fill down with{' '}
							<Kbd>
								<ShortcutHint keyName="D" />
							</Kbd>
							.
						</>
					}
					touchText="Use a keyboard or a mouse to select a range and paste into it."
				/>
			</EditHelp>
			<Grid
				tableProps={{ 'aria-label': 'People' }}
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
