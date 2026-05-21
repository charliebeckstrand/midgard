'use client'

import { useMemo, useState } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { DataTable, type DataTableColumn, type SortState } from '../../components/data-table'
import { HoldButton } from '../../components/hold-button'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Table' }

type Person = {
	id: number
	name: string
	email: string
	role: string
	status: 'active' | 'inactive'
}

const people: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', role: 'Developer', status: 'active' },
	{
		id: 2,
		name: 'Arlene McCoy',
		email: 'arlene@example.com',
		role: 'Designer',
		status: 'active',
	},
	{ id: 3, name: 'Devon Webb', email: 'devon@example.com', role: 'Manager', status: 'inactive' },
	{ id: 4, name: 'Tom Cook', email: 'tom@example.com', role: 'Developer', status: 'active' },
	{
		id: 5,
		name: 'Tanya Fox',
		email: 'tanya@example.com',
		role: 'Designer',
		status: 'inactive',
	},
]

const baseColumns: DataTableColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
	},
]

const sortableColumns: DataTableColumn<Person>[] = baseColumns.map((col) =>
	col.id === 'name' || col.id === 'email' || col.id === 'role' ? { ...col, sortable: true } : col,
)

function DefaultExample() {
	return <DataTable columns={baseColumns} rows={people} getKey={(row) => row.id} />
}

function SortableExample() {
	const [sort, setSort] = useState<SortState | undefined>({ column: 'name', direction: 'asc' })

	const sortedPeople = useMemo(() => {
		if (!sort) return people

		const key = sort.column as keyof Person

		const dir = sort.direction === 'asc' ? 1 : -1

		return [...people].sort((a, b) => (a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0))
	}, [sort])

	return (
		<DataTable
			columns={sortableColumns}
			rows={sortedPeople}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}

const SelectionExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<DataTable
			columns={[{ id: 'select', selectable: true, width: '48px' }, ...baseColumns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

const BatchActionsExample = () => {
	const [rows, setRows] = useState(people)

	return rows.length ? (
		<DataTable
			columns={[{ id: 'select', selectable: true }, ...baseColumns]}
			rows={rows}
			getKey={(row) => row.id}
			selection={{
				batchActions: ({ selection, setSelection }) => (
					<HoldButton
						size="sm"
						color="red"
						variant="soft"
						onComplete={() => {
							setRows((prev) => prev.filter((row) => !selection.has(row.id)))

							setSelection(new Set())
						}}
					>
						Delete {selection.size} items
					</HoldButton>
				),
			}}
		/>
	) : (
		<Button color="red" variant="soft" onClick={() => setRows(people)}>
			Reset
		</Button>
	)
}

const RowActionsExample = () => {
	return (
		<DataTable
			columns={[
				...baseColumns,
				{
					id: 'actions',
					actions: () => <Button color="blue">Edit</Button>,
				},
			]}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}

const ColumnManagerExample = () => {
	return (
		<DataTable
			columns={baseColumns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ enabled: true }}
		/>
	)
}

export default function DataTableDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example title="Sortable">
				<SortableExample />
			</Example>

			<Example title="Selection">
				<SelectionExample />
			</Example>

			<Example title="Batch actions">
				<BatchActionsExample />
			</Example>

			<Example title="Row actions">
				<RowActionsExample />
			</Example>

			<Example title="Striped">
				<DataTable striped columns={baseColumns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Grid">
				<DataTable grid columns={baseColumns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Compact density">
				<DataTable density="compact" columns={baseColumns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Sticky header" code={code`<DataTable stickyHeader maxHeight="200px" />`}>
				<DataTable
					stickyHeader
					maxHeight="200px"
					columns={baseColumns}
					rows={[...people, ...people]}
					getKey={(row, i) => `${row.id}-${i}`}
				/>
			</Example>

			<Example title="Loading">
				<DataTable loading columns={baseColumns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Empty">
				<DataTable columns={baseColumns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Column Manager">
				<ColumnManagerExample />
			</Example>
		</Stack>
	)
}
