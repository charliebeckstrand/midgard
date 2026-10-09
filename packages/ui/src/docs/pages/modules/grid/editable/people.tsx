import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import type { GridCellChange, GridColumn, GridEditCellContext } from 'ui/grid'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export type Person = { id: number; name: string; email: string; role: string; active: boolean }

export const initialPeople: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', role: 'Developer', active: true },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Designer', active: true },
	{ id: 3, name: 'Devon Webb', email: 'devon@example.com', role: 'Manager', active: false },
	{ id: 4, name: 'Tom Cook', email: 'tom@example.com', role: 'Developer', active: true },
]

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
 * stages the picked option, and the save of the row commits it.
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

const roleOptions = ['Developer', 'Designer', 'Manager', 'Analyst'].map((role) => ({
	label: role,
	value: role,
}))

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
		cell: (row) => (
			<Badge color={row.active ? 'green' : 'zinc'}>{row.active ? 'Active' : 'Inactive'}</Badge>
		),
	},
]

// The row field that each column edits, by the id of the column.
const personFields = new Map(personColumns.map((column) => [column.id, column.field]))
