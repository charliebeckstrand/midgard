import { useState } from 'react'
import { Flex } from 'ui/flex'
import { Grid, type GridCellRef, type GridEditableConfig } from 'ui/grid'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Text } from 'ui/text'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, type Person, personColumns } from './people.tsx'

type CommitOn = NonNullable<GridEditableConfig['commitOn']>

const commitOnOptions: { value: CommitOn; label: string }[] = [
	{ value: 'explicit', label: 'Keys' },
	{ value: 'leaveEditor', label: 'Leave cell' },
	{ value: 'leaveGrid', label: 'Leave grid' },
]

// The cell that the session edits, by its column and the place of its row.
function describeCell(cell: GridCellRef | null, people: Person[]): string {
	if (!cell) return 'Not editing'

	const column = personColumns.find((candidate) => candidate.id === cell.columnId)

	const row = people.findIndex((person) => person.id === cell.rowKey) + 1

	return `Editing: ${column?.title ?? cell.columnId}, row ${row}`
}

export default function CellScopeAndSpreadsheetKeys() {
	const [people, setPeople] = useState(initialPeople)

	const [editingCell, setEditingCell] = useState<GridCellRef | null>(null)

	const [commitOn, setCommitOn] = useState<CommitOn>('explicit')

	// With `scope: 'cell'`, the session edits one cell at a time, and Enter and
	// Tab move it as in a spreadsheet. `commitOn` sets what else saves the cell.
	return (
		<>
			<Segment
				value={commitOn}
				onValueChange={(next) =>
					setCommitOn(commitOnOptions.find((option) => option.value === next)?.value ?? 'explicit')
				}
			>
				<SegmentControl aria-label="Commit on">
					{commitOnOptions.map((option) => (
						<SegmentItem key={option.value} value={option.value}>
							{option.label}
						</SegmentItem>
					))}
				</SegmentControl>
			</Segment>
			<Flex justify="between" align="center">
				<Text size="sm" tone="muted">
					{describeCell(editingCell, people)}
				</Text>
				<EditHelp label="Editing help">
					<PointerHint
						mouse="Double-click a cell, press Enter or F2 on the cursor's cell, or start typing to edit that cell alone. Enter saves and moves down a row. Tab and Shift+Tab save and move along the row. F2 saves and stays, and Escape discards. Role and Active keep Enter for their own listbox menus, so Tab is their keyboard save. The segment sets what else saves the cell: Leave cell also saves when you click or tab away from the cell, and Leave grid also saves when focus leaves the grid."
						touch="A cell opens on a double-click or a key, so edit this grid with a mouse or a keyboard. The segment sets what else saves the cell: Leave cell also saves when you leave the cell, and Leave grid also saves when focus leaves the grid."
					/>
				</EditHelp>
			</Flex>
			<Grid
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				editable={{
					session: 'managed',
					scope: 'cell',
					commitOn,
					onCellChange: setEditingCell,
					onCommit: (changes) => setPeople((current) => applyChanges(current, changes)),
				}}
			/>
		</>
	)
}
