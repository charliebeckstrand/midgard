import { Redo2, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridHandle, type GridHistoryState } from 'ui/grid'
import { Icon } from 'ui/icon'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

export default function UndoAndRedo() {
	const [people, setPeople] = useState(initialPeople)

	const grid = useRef<GridHandle>(null)

	const [steps, setSteps] = useState<GridHistoryState>({ canUndo: false, canRedo: false })

	// `history` records each save. An undo sends the old values through
	// `onCommit`, and a redo sends the new values again.
	return (
		<>
			<Flex justify="between" align="center">
				<Flex gap="sm">
					<Button variant="soft" disabled={!steps.canUndo} onClick={() => grid.current?.undo()}>
						<Icon icon={<Undo2 />} />
						Undo
					</Button>
					<Button variant="soft" disabled={!steps.canRedo} onClick={() => grid.current?.redo()}>
						<Icon icon={<Redo2 />} />
						Redo
					</Button>
				</Flex>
				<EditHelp label="Undo help">
					Edit a cell and save it. Then, with focus on the grid, press Ctrl+Z or Cmd+Z to undo the
					save, and Ctrl+Shift+Z, Cmd+Shift+Z, or Ctrl+Y to redo it. In an open editor, the keys
					undo your typing instead.
				</EditHelp>
			</Flex>
			<Grid
				ref={grid}
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				editable={{
					session: 'managed',
					scope: 'cell',
					history: true,
					onHistoryChange: setSteps,
					onCommit: (changes) => setPeople((current) => applyChanges(current, changes)),
				}}
			/>
		</>
	)
}
