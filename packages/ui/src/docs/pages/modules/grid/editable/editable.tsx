import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridColumn } from 'ui/grid'
import { Icon } from 'ui/icon'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
import { applyChanges, EditHelp, initialPeople, type Person, personColumns } from './people.tsx'

export default function Editable() {
	const [people, setPeople] = useState(initialPeople)

	const [editing, setEditing] = useState<Set<string | number>>(new Set())

	// The pencil makes each cell of its row an editor, and the check saves the
	// row. With `session: 'managed'`, a double click, Enter, F2, or a key on a
	// cell also edits its row.
	const columns = useMemo(
		(): GridColumn<Person>[] => [
			...personColumns,
			{
				id: 'actions',
				actions: (row, { editing: rowEditing, save, discard }) =>
					rowEditing ? (
						<Flex gap="sm">
							<Button variant="bare" color="green" aria-label="Save row" onClick={save}>
								<Icon icon={<Check />} />
							</Button>
							<Button variant="bare" color="red" aria-label="Discard row edits" onClick={discard}>
								<Icon icon={<X />} />
							</Button>
						</Flex>
					) : (
						<Flex gap="sm">
							<Button
								variant="bare"
								color="blue"
								aria-label="Edit row"
								onClick={() => setEditing((current) => new Set(current).add(row.id))}
							>
								<Icon icon={<Pencil />} />
							</Button>
							<Button
								variant="bare"
								color="red"
								aria-label="Delete row"
								onClick={() =>
									setPeople((current) => current.filter((person) => person.id !== row.id))
								}
							>
								<Icon icon={<Trash2 />} />
							</Button>
						</Flex>
					),
			},
		],
		[],
	)

	return (
		<>
			<EditHelp label="Editing help">
				<PointerHint
					mouse="Double-click a cell, press F2, start typing, or click the pencil to edit its row: every cell becomes an editor at once. Tab moves between them. Enter saves the row's changes together and moves down a row, as the check saves them in place. Escape discards them."
					touch="Tap the pencil to edit its row: every cell becomes an editor at once. The check saves the row's changes, and the cross discards them."
				/>
			</EditHelp>
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				editable={{
					rows: editing,
					onRowsChange: setEditing,
					session: 'managed',
					onCommit: (changes) => setPeople((current) => applyChanges(current, changes)),
				}}
			/>
		</>
	)
}
