import { PencilIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { Flex } from '../../../../components/flex'
import { HoldButton } from '../../../../components/hold-button'
import { Icon } from '../../../../components/icon'
import {
	Grid,
	type GridColumn,
	type GridPaginationState,
	type SortState,
} from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { BulkEditExample, EditableExample } from './editable'

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

const roles = ['Developer', 'Designer', 'Manager', 'Analyst']

// A larger set so the pagination demos have several pages to move through.
const manyPeople: Person[] = Array.from({ length: 47 }, (_, i) => ({
	id: i + 1,
	name: `Person ${i + 1}`,
	email: `person${i + 1}@example.com`,
	role: roles[i % roles.length] ?? 'Developer',
	status: i % 3 === 0 ? 'inactive' : 'active',
}))

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

const clientSortColumns: GridColumn<Person>[] = sortableColumns.map((col) => ({
	...col,
	value: (row) => String(row[col.id as keyof Person]),
}))

const resizableColumns: GridColumn<Person>[] = columns.map((col) => ({
	...col,
	width: '180px',
	minWidth: 100,
}))

const searchableColumns: GridColumn<Person>[] = columns.map((col) => ({
	...col,
	value: (row) => String(row[col.id as keyof Person]),
}))

const filterableColumns: GridColumn<Person>[] = searchableColumns.map((col) =>
	col.id === 'status'
		? {
				...col,
				filterable: true,
				filterType: 'select',
				filterOptions: [
					{ label: 'Active', value: 'active' },
					{ label: 'Inactive', value: 'inactive' },
				],
			}
		: { ...col, filterable: true },
)

function DefaultExample() {
	return <Grid columns={columns} rows={people} getKey={(row) => row.id} />
}

function SortableExample() {
	const [sort, setSort] = useState<SortState | undefined>({ column: 'name', direction: 'asc' })

	// Server-side (manual) sorting: the consumer sorts `rows` and the grid leaves
	// their order untouched. Omit `manual` for the default client-side sort.
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
			sort={{ value: sort, onValueChange: setSort, manual: true }}
		/>
	)
}

function ClientSortExample() {
	const [sort, setSort] = useState<SortState | undefined>({ column: 'name', direction: 'asc' })

	// Client-side is the default: the grid sorts `people` itself by each column's
	// value (here an explicit `value`; columns without one sort by their field).
	return (
		<Grid
			columns={clientSortColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}

const ContextMenuExample = () => (
	// Right-click a header for sort + "Choose Columns" (which opens the manager
	// without a toolbar button), or a body cell for "Copy".
	<Grid
		columns={columns}
		rows={people}
		getKey={(row) => row.id}
		contextMenu={{ column: true, cell: true }}
	/>
)

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

const ResizableExample = () => (
	<Grid resizable columns={resizableColumns} rows={people} getKey={(row) => row.id} />
)

const SearchExample = () => {
	const [query, setQuery] = useState('')

	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: query, onValueChange: setQuery, placeholder: 'Search people' }}
		/>
	)
}

const ColumnFiltersExample = () => (
	<Grid columns={filterableColumns} rows={people} getKey={(row) => row.id} />
)

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

const ServerPaginationExample = () => {
	const [pagination, setPagination] = useState<GridPaginationState>({ pageIndex: 0, pageSize: 10 })

	// Stand-in for a server fetch: slice the requested page from the full set.
	const page = useMemo(
		() =>
			manyPeople.slice(
				pagination.pageIndex * pagination.pageSize,
				pagination.pageIndex * pagination.pageSize + pagination.pageSize,
			),
		[pagination],
	)

	return (
		<Grid
			columns={columns}
			rows={page}
			getKey={(row) => row.id}
			pagination={{
				value: pagination,
				onValueChange: setPagination,
				rowCount: manyPeople.length,
				pageSizeOptions: [10, 25],
			}}
		/>
	)
}

const ClientPaginationExample = () => (
	<Grid
		columns={columns}
		rows={manyPeople}
		getKey={(row) => row.id}
		pagination={{ defaultValue: { pageIndex: 0, pageSize: 10 }, pageSizeOptions: [10, 25, 50] }}
	/>
)

export function Demo() {
	return (
		<>
			<Example title="Default">
				<DefaultExample />
			</Example>

			<Example
				title="Server-side sorting"
				code={code`<Grid sort={{ value, onValueChange, manual: true }} />`}
			>
				<SortableExample />
			</Example>

			<Example title="Client sorting" code={code`<Grid sort={{ value, onValueChange }} />`}>
				<ClientSortExample />
			</Example>

			<Example
				title="Context menus"
				code={code`<Grid contextMenu={{ column: true, cell: true }} />`}
			>
				<ContextMenuExample />
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

			<Example title="Resizable columns" code={code`<Grid resizable columns={columns} />`}>
				<ResizableExample />
			</Example>

			<Example title="Search" code={code`<Grid search={{ value, onValueChange }} />`}>
				<SearchExample />
			</Example>

			<Example
				title="Column filters"
				code={code`<Grid columns={[{ ...col, filterable: true }]} />`}
			>
				<ColumnFiltersExample />
			</Example>

			<Example title="Column manager">
				<ColumnManagerExample />
			</Example>

			<Example
				title="Server pagination"
				code={code`<Grid pagination={{ value, onValueChange, rowCount }} />`}
			>
				<ServerPaginationExample />
			</Example>

			<Example title="Client pagination">
				<ClientPaginationExample />
			</Example>

			<Example title="Editable">
				<EditableExample />
			</Example>

			<Example title="Bulk edit">
				<BulkEditExample />
			</Example>
		</>
	)
}
