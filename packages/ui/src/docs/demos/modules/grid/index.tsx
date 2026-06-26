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

const truncatedColumns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	// A long title truncates in the header and reveals itself on hover, the same
	// way an overflowing cell does.
	{ id: 'email', title: 'Email address on file', cell: (row) => row.email },
	{
		id: 'role',
		title: 'Role',
		cell: (row) => row.role,
		// Supersede the default truncation tooltip with richer content; return
		// `null` from `cellTooltip` instead to disable it for a column.
		cellTooltip: (row) => `${row.name} — ${row.role}`,
	},
]

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

type Invoice = { id: number; ref: string; amount: string; status: 'paid' | 'due' }

const invoices: Invoice[] = [
	{ id: 1, ref: 'INV-2', amount: '$1,200.00', status: 'due' },
	{ id: 2, ref: 'INV-10', amount: '$90.50', status: 'paid' },
	{ id: 3, ref: 'INV-1', amount: '$340.00', status: 'due' },
]

const statusOrder: Record<Invoice['status'], number> = { paid: 0, due: 1 }

const invoiceColumns: GridColumn<Invoice>[] = [
	// Natural order: INV-1, INV-2, INV-10 (not INV-1, INV-10, INV-2).
	{ id: 'ref', title: 'Reference', cell: (row) => row.ref, value: (row) => row.ref },
	// Money sorts by amount, not by the leading digit of "$1,200.00".
	{ id: 'amount', title: 'Amount', cell: (row) => row.amount, value: (row) => row.amount },
	// A manual client-side comparator overrides the smart default.
	{
		id: 'status',
		title: 'Status',
		cell: (row) => row.status,
		value: (row) => row.status,
		sortFn: (a, b) => statusOrder[a.status] - statusOrder[b.status],
	},
]

const SmartSortExample = () => (
	// Smart by default: money, comma-grouped numbers, and numbers inside strings
	// sort correctly; the Status column supplies its own `sortFn`.
	<Grid
		columns={invoiceColumns}
		rows={invoices}
		getKey={(row) => row.id}
		sort={{ defaultValue: { column: 'amount', direction: 'asc' } }}
	/>
)

const ContextMenuExample = () => (
	// Context menus are on by default. Right-click a header for sort controls,
	// "Clear sort" (once the column is sorted), and "Choose Columns" (which opens
	// the manager without a toolbar button); right-click a body cell for "Copy".
	// Hold Ctrl while right-clicking for the browser's standard menu. Pass
	// `contextMenu={false}` to disable, or a builder to reshape the items.
	<Grid columns={columns} rows={people} getKey={(row) => row.id} />
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

const TruncationExample = () => (
	// In a narrow grid, overflowing cells — and column titles — truncate to an
	// ellipsis and reveal the full text in a tooltip on hover; the Role column
	// supersedes the cell tooltip via `cellTooltip`. Truncation is on by default —
	// pass `truncate={false}` to wrap.
	<div className="max-w-sm">
		<Grid resizable columns={truncatedColumns} rows={people} getKey={(row) => row.id} />
	</div>
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
				title="Smart sorting"
				code={code`<Grid columns={[{ ...col, sortFn: (a, b) => ... }]} />`}
			>
				<SmartSortExample />
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

			<Example
				title="Cell truncation"
				code={code`<Grid columns={[{ ...col, cellTooltip: (row) => detail }]} />`}
			>
				<TruncationExample />
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
