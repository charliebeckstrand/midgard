import { code, DensityListbox, Example } from 'docs'
import { PencilIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { HoldButton } from '../../../components/hold-button'
import { Icon } from '../../../components/icon'
import { Grid, type GridColumn, type SortState } from '../../../modules/grid'
import type { DensityLevel } from '../../../providers/density'

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

const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
	},
]

const sortableColumns: GridColumn<Person>[] = columns.map((col) =>
	col.id === 'name' || col.id === 'email' || col.id === 'role' ? { ...col, sortable: true } : col,
)

function DefaultExample() {
	return <Grid columns={columns} rows={people} getKey={(row) => row.id} />
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
		<Grid
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
		<Grid
			columns={[{ id: 'select', selectable: true, width: '48px' }, ...columns]}
			rows={people}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

const BatchActionsExample = () => {
	const [rows, setRows] = useState(people)

	return (
		<>
			{!rows.length && (
				<Button color="red" variant="soft" onClick={() => setRows(people)}>
					Reset
				</Button>
			)}

			<Grid
				columns={[{ id: 'select', selectable: true }, ...columns]}
				rows={rows}
				getKey={(row) => row.id}
				selection={{
					batchActions: ({ selection, setSelection }) => (
						<HoldButton
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
		</>
	)
}

const RowActionsExample = () => {
	return (
		<Grid
			columns={[
				...columns,
				{
					id: 'actions',
					actions: () => (
						<Flex gap="sm">
							<Button variant="bare" color="blue">
								<Icon icon={<PencilIcon />} />
							</Button>
							<Button variant="bare" color="red">
								<Icon icon={<TrashIcon />} />
							</Button>
						</Flex>
					),
				},
			]}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}

const ReorderExample = () => {
	const [order, setOrder] = useState<(string | number)[]>(['name', 'email', 'role', 'status'])

	return (
		<Grid
			reorder
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnOrder={{ value: order, onValueChange: setOrder }}
		/>
	)
}

const ColumnManagerExample = () => {
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ enabled: true }}
		/>
	)
}

export function Demo() {
	const [density, setDensity] = useState<DensityLevel>('snug')

	return (
		<>
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
				<Grid striped columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Outline">
				<Grid outline columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example
				title="Density"
				actions={<DensityListbox value={density} onValueChange={setDensity} />}
			>
				<Grid density={density} columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Sticky header" code={code`<Grid stickyHeader maxHeight="200px" />`}>
				<Grid
					stickyHeader
					maxHeight="200px"
					columns={columns}
					rows={[...people, ...people]}
					getKey={(row, i) => `${row.id}-${i}`}
				/>
			</Example>

			<Example title="Loading">
				<Grid loading columns={columns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Empty">
				<Grid columns={columns} rows={[]} getKey={(row) => row.id} />
			</Example>

			<Example title="Reorder">
				<ReorderExample />
			</Example>

			<Example title="Column manager">
				<ColumnManagerExample />
			</Example>
		</>
	)
}
