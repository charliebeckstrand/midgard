import { Badge } from '../../../../components/badge'
import type { GridColumn } from '../../../../modules/grid'

// The base fixture the grid tabs share: a small people set plus the column
// variants (sortable, searchable, filterable) each capability tab layers on.

export type Person = {
	id: number
	name: string
	email: string
	role: string
	status: 'active' | 'inactive'
}

export const people: Person[] = [
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

export const roles = ['Developer', 'Designer', 'Manager', 'Analyst']

// A larger set so the pagination demos have several pages to move through.
export const manyPeople: Person[] = Array.from({ length: 47 }, (_, i) => ({
	id: i + 1,
	name: `Person ${i + 1}`,
	email: `person${i + 1}@example.com`,
	role: roles[i % roles.length] ?? 'Developer',
	status: i % 3 === 0 ? 'inactive' : 'active',
}))

export const columns: GridColumn<Person>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name },
	{ id: 'email', title: 'Email', cell: (row) => row.email },
	{ id: 'role', title: 'Role', cell: (row) => row.role },
	{
		id: 'status',
		title: 'Status',
		cell: (row) => <Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>,
	},
]

export const sortableColumns: GridColumn<Person>[] = columns.map((col) =>
	col.id === 'name' || col.id === 'email' || col.id === 'role' ? { ...col, sortable: true } : col,
)

export const clientSortColumns: GridColumn<Person>[] = sortableColumns.map((col) => ({
	...col,
	value: (row) => String(row[col.id as keyof Person]),
}))

export const searchableColumns: GridColumn<Person>[] = columns.map((col) => ({
	...col,
	value: (row) => String(row[col.id as keyof Person]),
}))

export const filterableColumns: GridColumn<Person>[] = searchableColumns.map((col) => {
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
