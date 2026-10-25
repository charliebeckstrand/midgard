import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Grid, type GridCellRefusal, type GridEditableConfig } from 'ui/grid'
import { Icon } from 'ui/icon'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { isRole } from '../../../../data/people.ts'
import { PointerHint } from '../../../../kit/pointer-hint.tsx'
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
function toAddConfig(choice: AddControl): GridEditableConfig['newRowAdd'] {
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

	return name === '' ? [{ rowKey: 'new', columnId: 'name', error: 'Enter a name.' }] : []
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

		setPeople((prev) => [
			...prev,
			{
				id: Math.max(0, ...prev.map((person) => person.id)) + 1,
				name: String(values.name).trim(),
				email: String(values.email ?? ''),
				role: isRole(values.role) ? values.role : 'developer',
				active: values.active === true,
			},
		])

		return []
	}

	// On a phone, the two Segments stack, as the second does not fit beside the
	// first. `newRow` pins a blank row to the body, outside the rows. It has its own
	// sink, `onRowAdd`, as a new person has no key yet.
	return (
		<>
			<Flex justify="between" align={{ initial: 'start', sm: 'center' }}>
				<Flex direction={{ initial: 'col', sm: 'row' }} gap="sm" align="start">
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
					<PointerHint
						mouseText="Fill in the blank row, then press Enter to add the person."
						touchText="Fill in the blank row, then press Return to add the person."
					/>
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
					newRowAdd: toAddConfig(addControl),
					onRowAdd,
					onCommit: (changes) => setPeople((prev) => applyChanges(prev, changes)),
				}}
			/>
		</>
	)
}
