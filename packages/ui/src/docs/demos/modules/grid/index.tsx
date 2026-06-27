import { PencilIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '../../../../components/alert'
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
import { BulkEditExample, EditableExample, EditorTypesExample } from './editable'

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
	width: '200px',
	minWidth: 100,
}))

const searchableColumns: GridColumn<Person>[] = columns.map((col) => ({
	...col,
	value: (row) => String(row[col.id as keyof Person]),
}))

const filterableColumns: GridColumn<Person>[] = searchableColumns.map((col) => {
	if (col.id === 'status') {
		return {
			...col,
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: 'active' },
				{ label: 'Inactive', value: 'inactive' },
			],
		}
	}

	// A `select` filter without `filterOptions` offers the column's own values,
	// faceted from the data (sorted, de-duplicated).
	if (col.id === 'role') return { ...col, filterable: true, filterType: 'select' }

	return { ...col, filterable: true }
})

type Ticket = { id: number; title: string; due: string; estimate: number; resolved: boolean }

const tickets: Ticket[] = [
	{ id: 1, title: 'Fix login redirect', due: '2026-01-15', estimate: 3, resolved: true },
	{ id: 2, title: 'Add dark mode', due: '2026-03-01', estimate: 8, resolved: false },
	{ id: 3, title: 'Upgrade dependencies', due: '2026-02-10', estimate: 13, resolved: false },
	{ id: 4, title: 'Write API docs', due: '2026-04-20', estimate: 5, resolved: true },
]

// `date` filters compare an ISO `YYYY-MM-DD` value (before / on / after); `number`
// adds a two-bound "between" range; `boolean` offers is-true / is-false with no
// value input.
const ticketColumns: GridColumn<Ticket>[] = [
	{
		id: 'title',
		title: 'Title',
		cell: (row) => row.title,
		value: (row) => row.title,
		filterable: true,
	},
	{
		id: 'due',
		title: 'Due',
		cell: (row) => row.due,
		value: (row) => row.due,
		filterable: true,
		filterType: 'date',
	},
	{
		id: 'estimate',
		title: 'Estimate (h)',
		cell: (row) => row.estimate,
		value: (row) => row.estimate,
		filterable: true,
		filterType: 'number',
	},
	{
		id: 'resolved',
		title: 'Resolved',
		cell: (row) => (
			<Badge color={row.resolved ? 'green' : 'zinc'}>{row.resolved ? 'Yes' : 'No'}</Badge>
		),
		value: (row) => row.resolved,
		filterable: true,
		filterType: 'boolean',
	},
]

type Employee = {
	id: number
	name: string
	email: string
	role: string
	department: string
	location: string
	startDate: string
	salary: string
	status: 'active' | 'inactive'
}

const employees: Employee[] = [
	{
		id: 1,
		name: 'Wade Cooper',
		email: 'wade@example.com',
		role: 'Developer',
		department: 'Engineering',
		location: 'San Francisco',
		startDate: '2021-03-14',
		salary: '$145,000',
		status: 'active',
	},
	{
		id: 2,
		name: 'Arlene McCoy',
		email: 'arlene@example.com',
		role: 'Designer',
		department: 'Product',
		location: 'New York',
		startDate: '2022-07-01',
		salary: '$132,000',
		status: 'active',
	},
	{
		id: 3,
		name: 'Devon Webb',
		email: 'devon@example.com',
		role: 'Manager',
		department: 'Operations',
		location: 'Austin',
		startDate: '2019-11-23',
		salary: '$158,000',
		status: 'inactive',
	},
	{
		id: 4,
		name: 'Tom Cook',
		email: 'tom@example.com',
		role: 'Developer',
		department: 'Engineering',
		location: 'Seattle',
		startDate: '2023-02-12',
		salary: '$121,000',
		status: 'active',
	},
	{
		id: 5,
		name: 'Tanya Fox',
		email: 'tanya@example.com',
		role: 'Designer',
		department: 'Product',
		location: 'Remote',
		startDate: '2020-05-30',
		salary: '$139,000',
		status: 'inactive',
	},
]

// `pinned` freezes a column against horizontal scroll: `'left'` (or `true`) pulls
// it to the left edge, `'right'` to the right; the rest scroll between them. A
// pinned column is locked — it can't be reordered or hidden. Stacking columns on
// a side needs known widths, so this grid is `resizable` (fixed layout) and its
// sticky header rides the same scroll container as the frozen columns.
const employeeColumns: GridColumn<Employee>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, width: '200px', pinned: 'left' },
	{ id: 'email', title: 'Email', cell: (row) => row.email, width: '200px' },
	{ id: 'role', title: 'Role', cell: (row) => row.role, width: '160px' },
	{ id: 'department', title: 'Department', cell: (row) => row.department, width: '160px' },
	{ id: 'location', title: 'Location', cell: (row) => row.location, width: '160px' },
	{ id: 'startDate', title: 'Start date', cell: (row) => row.startDate, width: '160px' },
	{ id: 'salary', title: 'Salary', cell: (row) => row.salary, width: '160px' },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
		width: '160px',
		pinned: 'right',
	},
]

function DefaultExample() {
	return <Grid columns={columns} rows={people} getKey={(row) => row.id} />
}

function SortableExample() {
	const [sort, setSort] = useState<SortState[]>([{ column: 'name', direction: 'asc' }])

	// Server-side (manual) sorting: the consumer sorts `rows` and the grid leaves
	// their order untouched. The sort is an ordered list — Shift-click a header to
	// add columns — so the comparator walks it in priority order.
	const sortedPeople = useMemo(() => {
		if (!sort.length) return people

		return [...people].sort((a, b) => {
			for (const { column, direction } of sort) {
				const key = column as keyof Person

				const dir = direction === 'asc' ? 1 : -1

				if (a[key] < b[key]) return -dir

				if (a[key] > b[key]) return dir
			}

			return 0
		})
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
	const [sort, setSort] = useState<SortState[]>([{ column: 'name', direction: 'asc' }])

	// Client-side is the default: the grid sorts `people` itself by each column's
	// value (here an explicit `value`; columns without one sort by their field).
	// Shift-click a second header to sort by it too — the engine orders by the
	// whole list, and a priority badge appears on each sorted header.
	return (
		<Grid
			columns={clientSortColumns}
			rows={people}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}

function MultiSortExample() {
	// Seeded with a two-column sort (Role, then Name) so the priority badges show
	// at a glance; Shift-click any sortable header to extend or reorder the sort.
	const [sort, setSort] = useState<SortState[]>([
		{ column: 'role', direction: 'asc' },
		{ column: 'name', direction: 'asc' },
	])

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
		sort={{ defaultValue: [{ column: 'amount', direction: 'asc' }] }}
	/>
)

const ContextMenuExample = () => (
	// Context menus are on by default. Right-click a header for sort controls,
	// "Clear sort" (once the column is sorted), pin controls (Pin left / Pin right
	// / Unpin), and "Manage columns" (which opens the manager without a toolbar
	// button); right-click a body cell for "Copy". Hold Ctrl while right-clicking
	// for the browser's standard menu. Pass `contextMenu={false}` to disable, or a
	// builder to reshape the items.
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

const RowClickExample = () => {
	const [picked, setPicked] = useState<Person | null>(null)

	// A click on interactive cell content (here the row-action buttons) is ignored,
	// so the row click and per-row controls coexist. The row is also focusable and
	// activates on Enter / Space.
	return (
		<>
			{picked && <Badge color="blue">Selected {picked.name}</Badge>}
			<Grid
				columns={[
					...columns,
					{
						id: 'actions',
						actions: () => (
							<Button variant="bare" color="blue">
								<Icon icon={<PencilIcon />} />
							</Button>
						),
					},
				]}
				rows={people}
				getKey={(row) => row.id}
				onRowClick={(row) => setPicked(row)}
			/>
		</>
	)
}

const ErrorExample = () => {
	const [failed, setFailed] = useState(true)

	// `error` shows in place of the body — for a failed fetch — taking precedence
	// over rows and the empty slot. Pass a node (e.g. an Alert with a retry
	// control), or `error` (true) for a default alert.
	return (
		<>
			{!failed && (
				<Button variant="soft" color="red" onClick={() => setFailed(true)}>
					Reset
				</Button>
			)}
			<Grid
				columns={columns}
				rows={people}
				getKey={(row) => row.id}
				error={
					failed ? (
						<Alert color="red" variant="soft" title="Couldn't load people" block>
							<Button variant="soft" color="red" onClick={() => setFailed(false)}>
								Retry
							</Button>
						</Alert>
					) : undefined
				}
			/>
		</>
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

const PinnedExample = () => (
	// The Name column freezes to the left and Status to the right; scroll the grid
	// sideways and they stay put while the middle columns slide beneath them.
	<Grid
		resizable
		stickyHeader
		maxHeight="320px"
		columns={employeeColumns}
		rows={employees}
		getKey={(row) => row.id}
	/>
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

const DateBooleanFilterExample = () => (
	<Grid columns={ticketColumns} rows={tickets} getKey={(row) => row.id} />
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

// `exportable` adds an "Export to CSV" item to the header right-click menu; it
// downloads the filtered/sorted rows, each column read through its `value`.
const ExportExample = () => (
	<Grid exportable columns={filterableColumns} rows={people} getKey={(row) => row.id} />
)

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
		// `jumpToPage` adds a "Go to page" input for hopping straight to a page.
		pagination={{
			defaultValue: { pageIndex: 0, pageSize: 10 },
			pageSizeOptions: [10, 25, 50],
			jumpToPage: true,
		}}
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
				title="Multi-column sort"
				code={code`<Grid sort={{ value: [{ column, direction }, ...] }} />`}
			>
				<MultiSortExample />
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

			<Example title="Row click" code={code`<Grid onRowClick={(row) => ...} />`}>
				<RowClickExample />
			</Example>

			<Example title="Striped">
				<Grid striped columns={columns} rows={people} getKey={(row) => row.id} />
			</Example>

			<Example title="Hover">
				<Grid hover columns={columns} rows={people} getKey={(row) => row.id} />
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

			<Example title="Error state" code={code`<Grid error={<Alert ... />} />`}>
				<ErrorExample />
			</Example>

			<Example title="Reorder">
				<ReorderExample />
			</Example>

			<Example title="Resizable columns" code={code`<Grid resizable columns={columns} />`}>
				<ResizableExample />
			</Example>

			<Example
				title="Pinned columns"
				code={code`<Grid columns={[{ ...col, pinned: 'left' }, { ...col, pinned: 'right' }]} />`}
			>
				<PinnedExample />
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

			<Example
				title="Date, number & boolean filters"
				code={code`<Grid columns={[{ ...col, filterable: true, filterType: 'number' }]} />`}
			>
				<DateBooleanFilterExample />
			</Example>

			<Example title="Column manager">
				<ColumnManagerExample />
			</Example>

			<Example title="CSV export" code={code`<Grid exportable />`}>
				<ExportExample />
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

			<Example
				title="Editor types"
				code={code`<Grid columns={[{ ...col, editor: GridEditableSelectEditor }]} editable />`}
			>
				<EditorTypesExample />
			</Example>

			<Example title="Bulk edit">
				<BulkEditExample />
			</Example>
		</>
	)
}
