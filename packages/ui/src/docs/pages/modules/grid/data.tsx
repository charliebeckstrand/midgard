import { Badge } from 'ui/badge'
import type { GridColumn } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { words } from '../../../data/words.ts'

export type Person = {
	id: number
	name: string
	email: string
	role: string
	status: 'active' | 'inactive'
}

export const people: Person[] = [
	{ id: 1, name: 'Wade Cooper', email: 'wade@example.com', role: 'Developer', status: 'active' },
	{ id: 2, name: 'Arlene McCoy', email: 'arlene@example.com', role: 'Designer', status: 'active' },
	{ id: 3, name: 'Devon Webb', email: 'devon@example.com', role: 'Manager', status: 'inactive' },
	{ id: 4, name: 'Tom Cook', email: 'tom@example.com', role: 'Developer', status: 'active' },
	{ id: 5, name: 'Tanya Fox', email: 'tanya@example.com', role: 'Designer', status: 'inactive' },
]

export const roles = ['Developer', 'Designer', 'Manager', 'Analyst']

// The label of each status. The data keeps the status in lowercase.
export const statusLabels = words('person-status', { active: 'Active', inactive: 'Inactive' })

// The badge of a status, with its label.
export function StatusBadge({ status }: { status: Person['status'] }) {
	return <Badge color={status === 'active' ? 'green' : 'zinc'}>{statusLabels[status]}</Badge>
}

// A day in the numeric format of the locale of the reader. It is as wide as
// an ISO date, so the columns keep their widths.
export function DayText({ date }: { date: Date }) {
	const intl = useIntl()

	return intl.formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// An amount of whole dollars in the format of the locale of the reader.
export function MoneyText({ amount }: { amount: number }) {
	const intl = useIntl()

	return intl.formatNumber(amount, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// The generated person of an id. Each example that needs many people reads it,
// so a person is the same in each example.
export function makePerson(id: number): Person {
	return {
		id,
		name: `Person ${id}`,
		email: `person${id}@example.com`,
		role: roles[(id - 1) % roles.length] ?? 'Developer',
		status: (id - 1) % 3 === 0 ? 'inactive' : 'active',
	}
}

// A larger set, so that the pagination and the window examples have pages to move through.
export const manyPeople: Person[] = Array.from({ length: 47 }, (_, i) => makePerson(i + 1))

export const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <StatusBadge status={row.status} />,
		value: (row) => statusLabels[row.status],
	},
]

// The columns of an example that pages from a server with no server sort. They
// do not sort, as a client sort orders only the rows that loaded.
export const serverColumns: GridColumn<Person>[] = columns.map((column) => ({
	...column,
	sortable: false,
}))

// Each column with a `value` that search, filters, and the client sort read.
export const searchableColumns: GridColumn<Person>[] = columns.map((column) => ({
	...column,
	value: (row) => String(row[column.id as keyof Person]),
}))

// Status filters by a select of fixed options. Role filters by a select of the
// values in the rows, and each other column by text.
export const filterableColumns: GridColumn<Person>[] = searchableColumns.map((column) => {
	if (column.id === 'status') {
		return {
			...column,
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: statusLabels.active, value: 'active' },
				{ label: statusLabels.inactive, value: 'inactive' },
			],
		}
	}

	if (column.id === 'role') return { ...column, filterable: true, filterType: 'select' }

	return { ...column, filterable: true }
})

export type Employee = Person & {
	department: string
	location: string
	startDate: Date
	salary: number
	manager: string
	team: string
	phone: string
	level: string
}

export const employees: Employee[] = [
	{
		id: 1,
		name: 'Wade Cooper',
		email: 'wade@example.com',
		role: 'Developer',
		department: 'Engineering',
		location: 'San Francisco',
		startDate: new Date(2021, 2, 14),
		salary: 145_000,
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
		startDate: new Date(2022, 6, 1),
		salary: 132_000,
		manager: 'Devon Webb',
		team: 'Design systems',
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
		startDate: new Date(2019, 10, 23),
		salary: 158_000,
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
		startDate: new Date(2023, 1, 12),
		salary: 121_000,
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
		startDate: new Date(2020, 4, 30),
		salary: 139_000,
		manager: 'Arlene McCoy',
		team: 'Design systems',
		phone: '+1 (650) 555-0173',
		level: 'L5',
		status: 'inactive',
	},
]

// Name is pinned to the left edge and Status to the right edge. The other
// columns scroll between them.
export const employeeColumns: GridColumn<Employee>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{ id: 'department', title: 'Department', cell: (row) => row.department },
	{ id: 'location', title: 'Location', cell: (row) => row.location },
	{ id: 'startDate', title: 'Start date', cell: (row) => <DayText date={row.startDate} /> },
	{ id: 'salary', title: 'Salary', cell: (row) => <MoneyText amount={row.salary} /> },
	{ id: 'manager', title: 'Manager', cell: (row) => row.manager },
	{ id: 'team', title: 'Team', cell: (row) => row.team },
	{ id: 'phone', title: 'Phone', cell: (row) => row.phone },
	{ id: 'level', title: 'Level', cell: (row) => row.level },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <StatusBadge status={row.status} />,
		pinned: 'right',
	},
]
