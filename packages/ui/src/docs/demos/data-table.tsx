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

// ── Sample data ────────────────────────────────────────

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

// ── Sortable example ───────────────────────────────────

const sortableColumns: DataTableColumn<Person>[] = baseColumns.map((col) =>
	col.id === 'name' || col.id === 'email' || col.id === 'role' ? { ...col, sortable: true } : col,
)

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
			getRowKey={(row) => row.id}
			sort={sort}
			onSortChange={setSort}
		/>
	)
}

// ── Demo ───────────────────────────────────────────────

export default function DataTableDemo() {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				code={code`
					import { DataTable } from 'ui/data-table'

					<DataTable
						columns={columns}
						rows={rows}
						getRowKey={(row) => row.id}
					/>
				`}
			>
				<DataTable columns={baseColumns} rows={people} getRowKey={(row) => row.id} />
			</Example>

			<Example
				title="Sortable"
				code={code`
					import { DataTable, type SortState } from 'ui/data-table'

					const [sort, setSort] = useState<SortState | undefined>({
						column: 'name',
						direction: 'asc',
					})

					const sortedRows = useMemo(() => {
						if (!sort) return rows

						const key = sort.column as keyof Row

						const dir = sort.direction === 'asc' ? 1 : -1

						return [...rows].sort((a, b) =>
							a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0
						)
					}, [sort])

					<DataTable
						columns={columns}
						rows={sortedRows}
						getRowKey={(row) => row.id}
						sort={sort}
						onSortChange={setSort}
					/>
				`}
			>
				<SortableExample />
			</Example>

			<Example
				title="Selection"
				code={code`
					import { DataTable } from 'ui/data-table'

					const columns = [
						{ id: 'select', selectable: true, width: '48px' },
						{ id: 'name', title: 'Name', cell: (row) => row.name },
						...
					]

					<DataTable
						columns={columns}
						rows={rows}
						getRowKey={(row) => row.id}
						selection={selection}
						onSelectionChange={setSelection}
					/>
				`}
			>
				<DataTable
					columns={[{ id: 'select', selectable: true, width: '48px' }, ...baseColumns]}
					rows={people}
					getRowKey={(row) => row.id}
					selection={selection}
					onSelectionChange={(s) => setSelection(s ?? new Set())}
				/>
			</Example>

			<Example
				title="Batch actions"
				code={code`
					import { DataTable } from 'ui/data-table'

					<DataTable
						columns={columns}
						rows={rows}
						getRowKey={(row) => row.id}
						batchActions={(selected) => (
							<Button size="sm" onClick={() => alert(selected.size + ' selected')}>
								Delete
							</Button>
						)}
					/>
				`}
			>
				<DataTable
					columns={[{ id: 'select', selectable: true, width: '48px' }, ...baseColumns]}
					rows={people}
					getRowKey={(row) => row.id}
					batchActions={(selected) => (
						<HoldButton
							size="sm"
							color="red"
							variant="soft"
							onComplete={() => {
								setSelection(new Set())
							}}
						>
							Delete {selected.size > 0 && selected.size} items
						</HoldButton>
					)}
				/>
			</Example>

			<Example
				title="Row actions"
				code={code`
					import { DataTable } from 'ui/data-table'

					const columns = [
						...columns,
						{
							id: 'actions',
							actions: (row) => <Button plain size="sm">Edit</Button>,
						},
					]
				`}
			>
				<DataTable
					columns={[
						...baseColumns,
						{
							id: 'actions',
							actions: () => (
								<Button color="blue" size="sm">
									Edit
								</Button>
							),
						},
					]}
					rows={people}
					getRowKey={(row) => row.id}
				/>
			</Example>

			<Example title="Striped">
				<DataTable striped columns={baseColumns} rows={people} getRowKey={(row) => row.id} />
			</Example>

			<Example title="Grid">
				<DataTable grid columns={baseColumns} rows={people} getRowKey={(row) => row.id} />
			</Example>

			<Example title="Dense">
				<DataTable dense columns={baseColumns} rows={people} getRowKey={(row) => row.id} />
			</Example>

			<Example title="Sticky header" code={code`<DataTable stickyHeader maxHeight="200px" />`}>
				<DataTable
					stickyHeader
					maxHeight="200px"
					columns={baseColumns}
					rows={[...people, ...people]}
					getRowKey={(row, i) => `${row.id}-${i}`}
				/>
			</Example>

			<Example title="Loading">
				<DataTable loading columns={baseColumns} rows={[]} getRowKey={(row) => row.id} />
			</Example>

			<Example
				title="Column Manager"
				code={code`
					import { DataTable } from 'ui/data-table'

					<DataTable
						manageColumns
						columns={columns}
						defaultHiddenColumns={new Set(['location'])}
						rows={rows}
						getRowKey={(row) => row.id}
					/>
				`}
			>
				<DataTable manageColumns columns={baseColumns} rows={people} getRowKey={(row) => row.id} />
			</Example>
		</Stack>
	)
}
