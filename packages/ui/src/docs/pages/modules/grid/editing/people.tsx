import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import type { GridCellChange, GridColumn, GridEditCellContext } from 'ui/grid'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { people, roles, StatusBadge } from '../data.tsx'

export type Person = { id: number; name: string; email: string; role: string; active: boolean }

// The first four people of the page. The status is a yes or no value, so the
// grid gives the Active column a yes or no editor.
export const initialPeople: Person[] = people
	.slice(0, 4)
	.map(({ status, ...person }) => ({ ...person, active: status === 'active' }))

/**
 * Applies the saved changes to the rows. Each change sets the field of its
 * column on the row of its key.
 */
export function applyChanges(rows: Person[], changes: GridCellChange[]): Person[] {
	const patches = new Map<string | number, Record<string, unknown>>()

	for (const change of changes) {
		const field = personFields.get(change.columnId)

		if (field === undefined) continue

		patches.set(change.rowKey, { ...patches.get(change.rowKey), [field]: change.value })
	}

	return rows.map((row) => {
		const patch = patches.get(row.id)

		return patch ? { ...row, ...patch } : row
	})
}

/**
 * A button with a tooltip that tells how to edit the grid. A press opens the
 * tooltip, so that a reader on a touch screen can open it too.
 */
export function EditHelp({ label, children }: { label: string; children: ReactNode }) {
	return (
		<Flex justify="end">
			<Tooltip placement="left" trigger="click">
				<TooltipTrigger>
					<Button variant="bare" aria-label={label}>
						<Icon icon={<Info />} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>{children}</TooltipContent>
			</Tooltip>
		</Flex>
	)
}

/**
 * An editor for the `editCell` slot of a column: a listbox of options. It
 * stages the selected option, and the save of the row commits it.
 */
export function CellListbox({
	value,
	options,
	onValueUpdate,
	ariaLabel,
}: {
	value: string
	options: { label: string; value: string }[]
	onValueUpdate: GridEditCellContext<unknown>['onValueUpdate']
	ariaLabel: string
}) {
	return (
		<Listbox<string>
			aria-label={ariaLabel}
			value={value || null}
			onValueChange={(next) => onValueUpdate(next ?? '')}
			displayValue={(key) => options.find((option) => option.value === key)?.label ?? key}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}

const roleOptions = roles.map((role) => ({ label: role, value: role }))

// Name and Email get a text editor, and Active gets a yes or no listbox, from
// the type of the value. Role gets a listbox of its own.
export const personColumns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
	{
		id: 'role',
		title: 'Role',
		field: 'role',
		cell: (row) => row.role,
		editCell: (context) => (
			<CellListbox
				value={String(context.value ?? '')}
				options={roleOptions}
				onValueUpdate={context.onValueUpdate}
				ariaLabel={context.ariaLabel}
			/>
		),
	},
	{
		id: 'active',
		title: 'Active',
		field: 'active',
		cell: (row) => <StatusBadge status={row.active ? 'active' : 'inactive'} />,
	},
]

// The row field that each column edits, by the id of the column.
const personFields = new Map(personColumns.map((column) => [column.id, column.field]))
