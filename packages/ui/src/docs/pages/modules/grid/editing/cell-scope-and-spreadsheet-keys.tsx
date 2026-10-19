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
						mouse="Double-click a cell to edit it, then press Enter or Tab to save and move."
						touch="Tap a cell twice to edit it. On a phone the cell opens in a drawer, so tap Save. On a tablet, press Return to save and move down."
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
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
