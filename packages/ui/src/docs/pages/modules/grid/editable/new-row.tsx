import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridCellRefusal, type GridEditableConfig } from 'ui/grid'
import { Icon } from 'ui/icon'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { applyChanges, EditHelp, initialPeople, personColumns } from './people.tsx'

const positions = ['top', 'bottom'] as const

const addControls = [
	{ value: 'button', label: 'Button' },
	{ value: 'custom', label: 'Custom' },
	{ value: 'none', label: 'Enter only' },
] as const

type AddControl = (typeof addControls)[number]['value']

// The Add control of each choice: the button of the grid, a button of the
// example, or none.
function addControlOf(choice: AddControl): GridEditableConfig['newRowAdd'] {
	if (choice === 'none') return false

	if (choice === 'button') return undefined

	return {
		render: ({ add }) => (
			<Button
				variant="soft"
				color="blue"
				size="sm"
				prefix={<Icon icon={<UserPlus />} />}
				onClick={add}
			>
				Add
			</Button>
		),
	}
}

// The check of the mock server: a new person has a name.
function refuseNewPerson(values: Record<string, unknown>): GridCellRefusal[] {
	const name = String(values.name ?? '').trim()

	return name === '' ? [{ rowKey: 'new', columnId: 'name', error: 'A name is required' }] : []
}

export default function NewRow() {
	const [people, setPeople] = useState(initialPeople)

	const [position, setPosition] = useState<(typeof positions)[number]>('bottom')

	const [addControl, setAddControl] = useState<AddControl>('button')

	// The add takes a moment, as a save to a server does. A refusal keeps the
	// values in the row, with the reason under the cell.
	const onRowAdd = async (values: Record<string, unknown>) => {
		await new Promise((resolve) => setTimeout(resolve, 800))

		const refused = refuseNewPerson(values)

		if (refused.length > 0) return refused

		setPeople((current) => [
			...current,
			{
				id: Math.max(0, ...current.map((person) => person.id)) + 1,
				name: String(values.name).trim(),
				email: String(values.email ?? ''),
				role: String(values.role ?? 'Developer'),
				active: values.active === true,
			},
		])

		return []
	}

	// `newRow` pins a blank row to the body, outside the rows. It has its own
	// sink, `onRowAdd`, as a new person has no key yet.
	return (
		<>
			<Flex justify="between" align="center">
				<Flex gap="sm">
					<Segment
						value={position}
						onValueChange={(next) =>
							setPosition(positions.find((option) => option === next) ?? 'bottom')
						}
					>
						<SegmentControl aria-label="New row position">
							<SegmentItem value="top">Top</SegmentItem>
							<SegmentItem value="bottom">Bottom</SegmentItem>
						</SegmentControl>
					</Segment>
					<Segment
						value={addControl}
						onValueChange={(next) =>
							setAddControl(addControls.find((option) => option.value === next)?.value ?? 'button')
						}
					>
						<SegmentControl aria-label="Add control">
							{addControls.map((option) => (
								<SegmentItem key={option.value} value={option.value}>
									{option.label}
								</SegmentItem>
							))}
						</SegmentControl>
					</Segment>
				</Flex>
				<EditHelp label="New row help">
					The blank row adds a person. Fill its cells, then press Enter or the Add control at the
					end of the row. Escape clears the row. A name is required. The second segment sets the Add
					control: the button of the grid, a custom one, or none, so that only Enter adds the row.
				</EditHelp>
			</Flex>
			<Grid
				columns={personColumns}
				rows={people}
				getKey={(row) => row.id}
				maxHeight="320px"
				header={{ position: 'sticky' }}
				editable={{
					session: 'managed',
					scope: 'cell',
					newRow: position,
					newRowAdd: addControlOf(addControl),
					onRowAdd,
					onCommit: (changes) => setPeople((current) => applyChanges(current, changes)),
				}}
			/>
		</>
	)
}
