import { PencilIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '../../../../components/alert'
import { Badge } from '../../../../components/badge'
import { Button } from '../../../../components/button'
import { HoldButton } from '../../../../components/hold-button'
import { Icon } from '../../../../components/icon'
import { Segment, SegmentControl, SegmentItem } from '../../../../components/segment'
import { Sparkline } from '../../../../components/sparkline'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	Grid,
	type GridColumn,
	type GridColumnGroup,
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
	manager: string
	team: string
	phone: string
	level: string
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
		manager: 'Devon Webb',
		team: 'Platform',
		phone: '+1 (415) 555-0142',
		level: 'L5',
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
		manager: 'Devon Webb',
		team: 'Design Systems',
		phone: '+1 (212) 555-0188',
		level: 'L4',
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
		manager: 'Tanya Fox',
		team: 'Leadership',
		phone: '+1 (512) 555-0119',
		level: 'L6',
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
		manager: 'Wade Cooper',
		team: 'Platform',
		phone: '+1 (206) 555-0167',
		level: 'L3',
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
		manager: 'Arlene McCoy',
		team: 'Design Systems',
		phone: '+1 (650) 555-0173',
		level: 'L5',
		status: 'inactive',
	},
]

// `pinned` freezes a column against horizontal scroll: `'left'` (or `true`) pulls
// it to the left edge, `'right'` to the right; the rest scroll between them. A
// pinned column can't be reordered or hidden, and its header shows a pin button
// that unpins it — the column manager pins and unpins it too, listing it in the
// matching group (left prepended, right appended).
const employeeColumns: GridColumn<Employee>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{ id: 'department', title: 'Department', cell: (row) => row.department },
	{ id: 'location', title: 'Location', cell: (row) => row.location },
	{ id: 'startDate', title: 'Start date', cell: (row) => row.startDate },
	{ id: 'salary', title: 'Salary', cell: (row) => row.salary },
	{ id: 'manager', title: 'Manager', cell: (row) => row.manager },
	{ id: 'team', title: 'Team', cell: (row) => row.team },
	{ id: 'phone', title: 'Phone', cell: (row) => row.phone },
	{ id: 'level', title: 'Level', cell: (row) => row.level },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
		pinned: 'right',
	},
]

// `locked` freezes a column like `pinned`, but the user can't release it: no unpin
// button on its header, no pin items in its context menu, and a static edge arrow
// (pointing to the frozen edge, rather than a pin control) in the column manager.
// The three sets below share `employeeColumns` and vary only which edges are
// locked — left only, left alongside a user-pinned right, and both edges.

// Name locked to the left, with nothing else frozen.
const lockedLeftColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name'
		? { ...col, pinned: undefined, locked: 'left' }
		: col.id === 'status'
			? { ...col, pinned: undefined }
			: col,
)

// Name locked to the left (immutable) while Status stays user-pinned to the right.
const lockedMixedColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name' ? { ...col, pinned: undefined, locked: 'left' } : col,
)

// Both edges locked — Name to the left, Status to the right — neither releasable.
const lockedBothColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name'
		? { ...col, pinned: undefined, locked: 'left' }
		: col.id === 'status'
			? { ...col, pinned: undefined, locked: 'right' }
			: col,
)

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
			columns={[{ id: 'select', selectable: true }, ...columns]}
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
	// `error` shows in place of the body — for a failed fetch — taking precedence
	// over rows and the empty slot.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			error={<Alert color="red" variant="soft" title="Couldn't load people" block />}
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

const RowReorderExample = () => {
	// The consumer owns `rows`, so `rowReorder.onReorder` reports the reordered set
	// to commit back onto state. Add a `dragHandle` column for the grip; drag a row
	// by its handle (pointer or keyboard) to move it within the set.
	const [items, setItems] = useState(people)

	return (
		<Grid
			columns={[{ id: 'drag', dragHandle: true }, ...columns]}
			rows={items}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			rowReorder={{ onReorder: setItems }}
		/>
	)
}

const RowGroupExample = () => {
	// `groupBy` collects rows sharing a column's value under an expandable
	// group-header row (the value plus a count). Switch the grouped column, or pick
	// "None" to ungroup; groups start expanded — toggle a header to collapse it.
	// Sorting, filtering, and selection still apply within the groups.
	const [groupBy, setGroupBy] = useState<string | number | null>('role')

	return (
		<Stack gap="md">
			<Segment
				value={groupBy == null ? 'none' : String(groupBy)}
				onValueChange={(next) => setGroupBy(next == null || next === 'none' ? null : next)}
			>
				<SegmentControl aria-label="Group by">
					<SegmentItem value="role">By role</SegmentItem>
					<SegmentItem value="status">By status</SegmentItem>
					<SegmentItem value="none">None</SegmentItem>
				</SegmentControl>
			</Segment>

			<Grid
				columns={sortableColumns}
				rows={people}
				getKey={(row) => row.id}
				groupBy={{ value: groupBy, onValueChange: setGroupBy }}
			/>
		</Stack>
	)
}

const CollapsedGroupExample = () => (
	// `defaultExpanded: false` starts every group collapsed — just the value/count
	// summaries — until a header is expanded.
	<Grid
		columns={columns}
		rows={people}
		getKey={(row) => row.id}
		groupBy={{ value: 'status', defaultExpanded: false }}
	/>
)

const ResizableExample = () => (
	<Grid resizable columns={columns} rows={people} getKey={(row) => row.id} />
)

const PinnedExample = () => (
	// The Name column freezes to the left and Status to the right; scroll the grid
	// sideways and they stay put while the middle columns slide beneath them.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={employeeColumns}
		rows={employees}
		getKey={(row) => row.id}
	/>
)

const PinnedSelectionExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	// The selection column always freezes to the far left, ahead of the
	// left-pinned Name column: scroll the grid sideways and the row checkboxes stay
	// anchored at the edge while the middle columns slide beneath them.
	return (
		<Grid
			resizable
			header={{ position: 'sticky' }}
			maxHeight="320px"
			columns={[{ id: 'select', selectable: true }, ...employeeColumns]}
			rows={employees}
			getKey={(row) => row.id}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
		/>
	)
}

const LockedLeftExample = () => (
	// Name is locked to the left — frozen with no unpin affordance anywhere. Its
	// header shows an edge arrow (not a pin button), and the column manager shows
	// the same arrow instead of a pin control; the other columns scroll past it.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedLeftColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
	/>
)

const LockedWithPinnedExample = () => (
	// Name is locked to the left (immutable) while Status is user-pinned to the
	// right (the user can unpin it). Open the column manager to see the locked
	// Name's edge arrow beside the other columns' interactive pin controls.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedMixedColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
	/>
)

const LockedBothEdgesExample = () => (
	// Name is locked to the left and Status to the right — both frozen and
	// immutable, so the row stays anchored on both edges while the middle scrolls.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedBothColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
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
	// Column management is on by default (the header right-click menu's "Manage
	// columns" opens the dialog); `toolbarButton` adds the standalone button
	// shown here. Toggle a column's checkbox to hide it, drag to reorder, or use a
	// row's pin control to freeze it left/right (left columns sort to the top of
	// the list, right columns to the bottom). Pass `columnManager={{ enabled:
	// false }}` to turn it off entirely.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ toolbarButton: true }}
		/>
	)
}

// A `groups` array bands a contiguous run of columns under a colored, labeled
// header. Each group names its member `columns` (kept adjacent and moved as a
// block), a `title`, and a `color` from the standard + extended Badge palette.
const columnGroups: GridColumnGroup[] = [
	{ id: 'contact', title: 'Contact', color: 'blue', columns: ['name', 'email'] },
	{ id: 'org', title: 'Organization', color: 'violet', columns: ['role', 'status'] },
]

const GroupsExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} groups={columnGroups} />
)

// A `collapsible` group folds to its first column behind an expand toggle,
// hiding the rest until reopened; `defaultCollapsed` seeds it folded. `icon` and
// `description` (a tooltip) round out the band.
const collapsibleGroups: GridColumnGroup[] = [
	{
		id: 'contact',
		title: 'Contact',
		color: 'blue',
		description: 'How to reach this person',
		columns: ['name', 'email'],
		collapsible: true,
	},
	{
		id: 'org',
		title: 'Organization',
		color: 'violet',
		columns: ['role', 'status'],
		collapsible: true,
		defaultCollapsed: true,
	},
]

const CollapsibleGroupsExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} groups={collapsibleGroups} />
)

// Passing a `groups` binding turns on the column manager's group editor: a "New
// group" button, a zone per group (name, color, remove), and an ungrouped pool.
// Drag columns between zones — or use a row's "Move" menu — to change membership.
const GroupManagerExample = () => {
	const [groups, setGroups] = useState<GridColumnGroup[]>(columnGroups)

	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			groups={{ value: groups, onValueChange: setGroups }}
			columnManager={{ toolbarButton: true }}
		/>
	)
}

// `exportable` adds one item per export type to the header and cell right-click
// menus, plus an "Export" toolbar dropdown listing them; each downloads (or, for
// `print`, opens the print dialog over) the filtered/sorted rows — or just the
// selected rows when a selection is active — every column read through its
// `value`. `true` enables the full default set (CSV, Excel, print); an explicit
// array picks a subset instead.
const ExportExample = () => (
	<Grid
		exportable={['csv', 'excel']}
		columns={filterableColumns}
		rows={people}
		getKey={(row) => row.id}
	/>
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
		pagination={{
			defaultValue: { pageIndex: 0, pageSize: 10 },
			pageSizeOptions: [10, 25, 50],
		}}
	/>
)

// The opt-in `footer` summary bar renders only the settings it's given. `rowTotal`
// counts the full filtered extent (search below narrows it to "N of M rows"),
// `selectedTotal` shows the live selection count, and `content` receives those
// counts to render a trailing slot — here a soft "Clear" button, shown only while
// a row is selected.
const FooterExample = () => {
	const [selection, setSelection] = useState<Set<string | number>>(new Set())

	const [search, setSearch] = useState('')

	return (
		<Grid
			columns={[{ id: 'select', selectable: true }, ...searchableColumns]}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: search, onValueChange: setSearch }}
			selection={{ value: selection, onValueChange: (s) => setSelection(s ?? new Set()) }}
			footer={{
				rowTotal: true,
				selectedTotal: true,
				content: ({ selected }) =>
					selected > 0 ? (
						<Button variant="soft" onClick={() => setSelection(new Set())}>
							Clear
						</Button>
					) : null,
			}}
		/>
	)
}

// `rowTotal` alone: a plain count of the rendered rows, no selection or content.
const RowTotalExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} footer={{ rowTotal: true }} />
)

type Metric = {
	id: number
	name: string
	total: string
	trend: number[]
}

const metrics: Metric[] = [
	{
		id: 1,
		name: 'Revenue',
		total: '$48.2k',
		trend: [12, 14, 13, 18, 22, 21, 27, 30, 28, 34, 39, 44],
	},
	{
		id: 2,
		name: 'Signups',
		total: '1,204',
		trend: [40, 38, 42, 35, 33, 30, 34, 28, 25, 27, 22, 19],
	},
	{ id: 3, name: 'Latency', total: '128ms', trend: [8, 9, 7, 11, 6, 12, 5, 10, 7, 9, 6, 8] },
	{ id: 4, name: 'Errors', total: '0.4%', trend: [2, 1, 3, 1, 0, 2, 1, 4, 1, 0, 1, 0] },
]

// A sparkline is a plain cell renderer: drop the reusable `Sparkline` into a
// column's `cell` and hand it the row's series. The Trend column adds `animate`
// (the line draws itself and the area fades in on mount, honouring
// reduced-motion); the By-period column uses the bar variant. Both read the same
// per-row `trend`, and each carries a summarizing `aria-label` since the chart is
// `role="img"`.
const sparklineColumns: GridColumn<Metric>[] = [
	{ id: 'name', title: 'Metric', cell: (row) => row.name },
	{ id: 'total', title: 'Total', cell: (row) => row.total },
	{
		id: 'trend',
		title: 'Trend',
		cell: (row) => (
			<Sparkline
				data={row.trend}
				color="blue"
				fill
				endPoint
				animate
				aria-label={`${row.name} trend, last 12 periods`}
			/>
		),
	},
	{
		id: 'bars',
		title: 'By period',
		cell: (row) => (
			<Sparkline
				data={row.trend}
				variant="bar"
				color="green"
				aria-label={`${row.name} by period, last 12 periods`}
			/>
		),
	},
]

const SparklineExample = () => (
	<Grid columns={sparklineColumns} rows={metrics} getKey={(row) => row.id} />
)

// The demo is sectioned into tabs so the long example list reads as discrete
// capabilities rather than one scroll. Panels unmount when inactive
// (`fade={false}`) so the page's jump nav only ever lists the visible tab's
// examples and never scrolls to a hidden one.
const tabs = [
	'Variants',
	'Sorting',
	'Selection',
	'Reorder',
	'Row groups',
	'Resize',
	'Pin',
	'Lock',
	'Groups',
	'Filters',
	'Header',
	'Footer',
	'Toolbar',
	'Export',
	'Sparkline',
	'Pagination',
	'State',
	'Editable',
] as const

export function Demo() {
	return (
		<Tabs defaultValue="Variants">
			<TabList aria-label="Grid examples">
				{tabs.map((tab) => (
					<Tab key={tab} value={tab}>
						{tab}
					</Tab>
				))}
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Variants">
					<Stack gap="xl">
						<Example title="Default">
							<DefaultExample />
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

						<Example
							title="Condensed"
							code={code`<Grid condensed columns={columns} rows={rows} getKey={...} />`}
						>
							<Grid condensed columns={columns} rows={people} getKey={(row) => row.id} />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Sorting">
					<Stack gap="xl">
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
					</Stack>
				</TabContent>

				<TabContent value="Selection">
					<Stack gap="xl">
						<Example title="Selection">
							<SelectionExample />
						</Example>

						<Example title="Batch actions">
							<BatchActionsExample />
						</Example>

						<Example title="Row click" code={code`<Grid onRowClick={(row) => ...} />`}>
							<RowClickExample />
						</Example>

						<Example
							title="Context menus"
							code={code`<Grid contextMenu={{ column: true, cell: true }} />`}
						>
							<ContextMenuExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Reorder">
					<Stack gap="xl">
						<Example title="Column reorder">
							<ReorderExample />
						</Example>

						<Example
							title="Row reorder"
							code={code`<Grid columns={[{ id: 'drag', dragHandle: true }, ...]} rowReorder={{ onReorder }} />`}
						>
							<RowReorderExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Row groups">
					<Stack gap="xl">
						<Example
							title="Group by column"
							code={code`<Grid groupBy={{ value: 'role', onValueChange }} />`}
						>
							<RowGroupExample />
						</Example>

						<Example
							title="Collapsed groups"
							code={code`<Grid groupBy={{ value: 'status', defaultExpanded: false }} />`}
						>
							<CollapsedGroupExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Resize">
					<Stack gap="xl">
						<Example title="Resizable columns" code={code`<Grid resizable columns={columns} />`}>
							<ResizableExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Pin">
					<Stack gap="xl">
						<Example
							title="Pinned columns"
							code={code`<Grid columns={[{ ...col, pinned: 'left' }, { ...col, pinned: 'right' }]} />`}
						>
							<PinnedExample />
						</Example>

						<Example
							title="Pinned selection"
							code={code`<Grid columns={[{ id: 'select', selectable: true }, ...pinnedColumns]} />`}
						>
							<PinnedSelectionExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Lock">
					<Stack gap="xl">
						<Example
							title="Locked left"
							code={code`<Grid columns={[{ ...col, locked: 'left' }]} />`}
						>
							<LockedLeftExample />
						</Example>

						<Example
							title="Locked with pinnable columns"
							code={code`<Grid columns={[{ ...col, locked: 'left' }, { ...col, pinned: 'right' }]} />`}
						>
							<LockedWithPinnedExample />
						</Example>

						<Example
							title="Locked on both edges"
							code={code`<Grid columns={[{ ...col, locked: 'left' }, { ...col, locked: 'right' }]} />`}
						>
							<LockedBothEdgesExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Filters">
					<Stack gap="xl">
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
					</Stack>
				</TabContent>

				<TabContent value="Header">
					<Stack gap="xl">
						<Example
							title="Sticky header"
							code={code`<Grid header={{ position: 'sticky' }} maxHeight="200px" />`}
						>
							<Grid
								header={{ position: 'sticky' }}
								maxHeight="200px"
								columns={columns}
								rows={[...people, ...people]}
								getKey={(row, i) => `${row.id}-${i}`}
							/>
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Footer">
					<Stack gap="xl">
						<Example title="Row total" code={code`<Grid footer={{ rowTotal: true }} />`}>
							<RowTotalExample />
						</Example>

						<Example
							title="Selection summary"
							code={code`<Grid footer={{ rowTotal: true, selectedTotal: true, content: ({ selected }) => ... }} />`}
						>
							<FooterExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Groups">
					<Stack gap="xl">
						<Example
							title="Column groups"
							code={code`<Grid groups={[{ id, title, color, columns: [...] }]} />`}
						>
							<GroupsExample />
						</Example>

						<Example
							title="Collapsible groups"
							code={code`<Grid groups={[{ ...group, collapsible: true, defaultCollapsed }]} />`}
						>
							<CollapsibleGroupsExample />
						</Example>

						<Example
							title="Group editor"
							code={code`<Grid groups={{ value, onValueChange }} columnManager={{ toolbarButton: true }} />`}
						>
							<GroupManagerExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Toolbar">
					<Stack gap="xl">
						<Example title="Column manager">
							<ColumnManagerExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Export">
					<Stack gap="xl">
						<Example title="CSV + Excel" code={code`<Grid exportable={['csv', 'excel']} />`}>
							<ExportExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Sparkline">
					<Stack gap="xl">
						<Example
							title="In-cell sparklines"
							code={code`<Grid columns={[{ ...col, cell: (row) => <Sparkline data={row.trend} /> }]} />`}
						>
							<SparklineExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Pagination">
					<Stack gap="xl">
						<Example
							title="Server pagination"
							code={code`<Grid pagination={{ value, onValueChange, rowCount }} />`}
						>
							<ServerPaginationExample />
						</Example>

						<Example title="Client pagination">
							<ClientPaginationExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="State">
					<Stack gap="xl">
						<Example title="Loading">
							<Grid loading columns={columns} rows={[]} getKey={(row) => row.id} />
						</Example>

						<Example title="Empty">
							<Grid columns={columns} rows={[]} getKey={(row) => row.id} />
						</Example>

						<Example title="Error" code={code`<Grid error={<Alert ... />} />`}>
							<ErrorExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Editable">
					<Stack gap="xl">
						<Example
							title="Editable"
							code={code`<Grid editable={{ rows, onRowsChange, onValueChange }} />`}
						>
							<EditableExample />
						</Example>

						<Example
							title="Editor types"
							code={code`<Grid columns={[{ ...col, field, editCell }]} editable={{ rows, onValueChange }} />`}
						>
							<EditorTypesExample />
						</Example>

						<Example title="Bulk edit">
							<BulkEditExample />
						</Example>
					</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
