import { Redo2, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridHandle, type GridHistoryState } from 'ui/grid'
import { Icon } from 'ui/icon'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

export default function UndoAndRedo() {
	const [people, setPeople] = useState(initialPeople)

	const gridRef = useRef<GridHandle>(null)

	const [steps, setSteps] = useState<GridHistoryState>({ canUndo: false, canRedo: false })

	// `history` records each save. An undo sends the old values through
	// `onCommit`, and a redo sends the new values again.
	return (
		<>
			<Flex justify="between" align="center">
				<Flex gap="sm">
					<Button variant="soft" disabled={!steps.canUndo} onClick={() => gridRef.current?.undo()}>
						<Icon icon={<Undo2 />} />
						Undo
					</Button>
					<Button variant="soft" disabled={!steps.canRedo} onClick={() => gridRef.current?.redo()}>
						<Icon icon={<Redo2 />} />
						Redo
					</Button>
				</Flex>
				<EditHelp label="Undo help">
					<PointerHint
						mouseText="Edit a cell, then press Ctrl+Z or Cmd+Z to undo the save."
						touchText="Edit a cell, then tap Undo."
					/>
				</EditHelp>
			</Flex>
			<Grid
				ref={gridRef}
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				editable={{
					session: 'managed',
					scope: 'cell',
					history: true,
					onHistoryChange: setSteps,
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
