import { Badge } from 'ui/badge'
import type { GridColumn } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import {
	departments,
	people as listPeople,
	type Person as Profile,
	person,
	personStatuses,
	roles,
	teams,
} from '../../../data/people.ts'

// The fields of a person that most grids show.
export type Person = Pick<Profile, 'id' | 'name' | 'email' | 'role' | 'status'>

/** The fields of `profile` that most grids show. */
function toPerson({ id, name, email, role, status }: Profile): Person {
	return { id, name, email, role, status }
}

// The first five people, for a grid that shows each row.
export const people: Person[] = listPeople(5).map(toPerson)

// The status of a person as a badge, with its word.
export function StatusBadge({ status }: { status: Person['status'] }) {
	return <Badge color={status === 'active' ? 'green' : 'zinc'}>{personStatuses[status]}</Badge>
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

// The person of an id. Each example that needs many people reads it, so a
// person is the same in each example.
export function makePerson(id: number): Person {
	return toPerson(person(id))
}

// A larger set, so that the pagination and the window examples have pages to move through.
export const manyPeople: Person[] = listPeople(47).map(toPerson)

export const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => roles[row.role], value: (row) => roles[row.role] },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <StatusBadge status={row.status} />,
		value: (row) => personStatuses[row.status],
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
	value: column.value ?? ((row) => String(row[column.id as keyof Person])),
}))

// Status filters by a select of fixed options, which compare with the status
// of the row. Role filters by a select of the values in the rows, and each
// other column by text.
export const filterableColumns: GridColumn<Person>[] = searchableColumns.map((column) => {
	if (column.id === 'status') {
		return {
			...column,
			value: (row) => row.status,
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: personStatuses.active, value: 'active' },
				{ label: personStatuses.inactive, value: 'inactive' },
			],
		}
	}

	if (column.id === 'role') return { ...column, filterable: true, filterType: 'select' }

	return { ...column, filterable: true }
})

// Each field of a person, for a grid with many columns.
export type Employee = Profile

export const employees: Employee[] = listPeople(5)

// Name is pinned to the left edge and Status to the right edge. The other
// columns scroll between them.
export const employeeColumns: GridColumn<Employee>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => roles[row.role] },
	{ id: 'department', title: 'Department', cell: (row) => departments[row.department] },
	{ id: 'location', title: 'Location', cell: (row) => row.location },
	{ id: 'startDate', title: 'Start date', cell: (row) => <DayText date={row.startDate} /> },
	{ id: 'salary', title: 'Salary', cell: (row) => <MoneyText amount={row.salary} /> },
	{ id: 'manager', title: 'Manager', cell: (row) => row.manager },
	{ id: 'team', title: 'Team', cell: (row) => teams[row.team] },
	{ id: 'phone', title: 'Phone', cell: (row) => row.phone },
	{ id: 'level', title: 'Level', cell: (row) => row.level },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <StatusBadge status={row.status} />,
		pinned: 'right',
	},
]
