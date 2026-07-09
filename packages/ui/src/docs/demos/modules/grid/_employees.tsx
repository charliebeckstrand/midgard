import { Badge } from '../../../../components/badge'
import type { GridColumn } from '../../../../modules/grid'

// The wide fixture the Pin and Lock tabs share: enough columns to overflow
// sideways, so frozen edges have something to hold against.

export type Employee = {
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

export const employees: Employee[] = [
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
export const employeeColumns: GridColumn<Employee>[] = [
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
export const lockedLeftColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name'
		? { ...col, pinned: undefined, locked: 'left' }
		: col.id === 'status'
			? { ...col, pinned: undefined }
			: col,
)

// Name locked to the left (immutable) while Status stays user-pinned to the right.
export const lockedMixedColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name' ? { ...col, pinned: undefined, locked: 'left' } : col,
)

// Both edges locked — Name to the left, Status to the right — neither releasable.
export const lockedBothColumns: GridColumn<Employee>[] = employeeColumns.map((col) =>
	col.id === 'name'
		? { ...col, pinned: undefined, locked: 'left' }
		: col.id === 'status'
			? { ...col, pinned: undefined, locked: 'right' }
			: col,
)
