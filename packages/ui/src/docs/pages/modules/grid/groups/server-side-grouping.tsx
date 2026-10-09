import { useEffect, useRef, useState } from 'react'
import { Grid, type GridColumn, type GridGroupHeaderRow } from 'ui/grid'

// One row shape for both kinds of row from the server. A group header has the
// `group` marker, and its sums in the fields of a row.
type Order = {
	id: string
	country: string
	customer?: string
	orders: number
	revenue: number
	group?: { key: string; count: number }
}

const countries = ['Norway', 'Japan', 'Brazil', 'Canada']

// The data of the mock server, by country.
const customersByCountry: Record<string, Order[]> = Object.fromEntries(
	countries.map((country, c) => [
		country,
		Array.from({ length: 4 + (c % 2) }, (_, i) => ({
			id: `${country}:${i + 1}`,
			country,
			customer: `Customer ${c * 10 + i + 1}`,
			orders: ((c + 2) * (i + 3)) % 17,
			revenue: 480 * (c + 1) + 315 * i,
		})),
	]),
)

// Each request of the mock server resolves after a short time.
function respond<T>(value: T): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), 500))
}

// The group headers: one row for each country, with the count and the sums.
const fetchGroups = () =>
	respond(
		countries.map((country): Order => {
			const children = customersByCountry[country] ?? []

			return {
				id: `group:${country}`,
				country,
				orders: children.reduce((sum, row) => sum + row.orders, 0),
				revenue: children.reduce((sum, row) => sum + row.revenue, 0),
				group: { key: country, count: children.length },
			}
		}),
	)

const fetchChildren = (country: string) => respond(customersByCountry[country] ?? [])

const fetchRows = () => respond(Object.values(customersByCountry).flat())

const dollars = (value: unknown) => `$${Number(value).toLocaleString('en-US')}`

const orderColumns: GridColumn<Order>[] = [
	// A `groupable` column has a button on its header that groups by it. It is
	// sortable too, so a sort moves the groups. Manual grouping makes the sort of
	// each other column manual, and the mock server does not sort, so those
	// columns do not sort.
	{
		id: 'country',
		title: 'Country',
		groupable: true,
		sortable: true,
		cell: (row) => row.country,
		value: (row) => row.country,
	},
	{
		id: 'customer',
		title: 'Customer',
		sortable: false,
		cell: (row) => row.customer ?? '',
		value: (row) => row.customer,
	},
	{
		id: 'orders',
		title: 'Orders',
		sortable: false,
		cell: (row) => String(row.orders),
		value: (row) => row.orders,
		aggFunc: 'sum',
	},
	{
		id: 'revenue',
		title: 'Revenue',
		sortable: false,
		cell: (row) => dollars(row.revenue),
		value: (row) => row.revenue,
		aggFunc: 'sum',
		aggCell: ({ value }) => dollars(value),
	},
]

// A row with the group marker is a group header. Each other row is a leaf.
const groupRow = (row: Order): GridGroupHeaderRow | null =>
	row.group ? { key: row.group.key, value: row.country, count: row.group.count } : null

export default function ServerSideGrouping() {
	const [rows, setRows] = useState<Order[]>([])

	const [groupedBy, setGroupedBy] = useState<string | number | null>('country')

	const [expanded, setExpanded] = useState<Set<string | number>>(new Set())

	const [loading, setLoading] = useState(true)

	// The groups whose rows arrived. A collapsed group keeps its rows.
	const loaded = useRef(new Set<string | number>())

	// Each grouping is a new epoch. A response from an earlier epoch is stale,
	// so it changes nothing.
	const epoch = useRef(0)

	useEffect(() => {
		const request = epoch.current

		fetchGroups().then((groups) => {
			if (request !== epoch.current) return

			setRows(groups)

			setLoading(false)
		})

		return () => {
			epoch.current += 1
		}
	}, [])

	const regroup = (columnId: string | number | null) => {
		epoch.current += 1

		const request = epoch.current

		setGroupedBy(columnId)

		setExpanded(new Set())

		loaded.current = new Set()

		setLoading(true)

		;(columnId === null ? fetchRows() : fetchGroups()).then((next) => {
			if (request !== epoch.current) return

			setRows(next)

			setLoading(false)
		})
	}

	// The rows of a group go after its header when they arrive.
	const loadChildren = (key: string | number) => {
		if (loaded.current.has(key)) return

		loaded.current.add(key)

		const request = epoch.current

		fetchChildren(String(key)).then((children) => {
			if (request !== epoch.current) return

			setRows((current) => {
				const at = current.findIndex((row) => row.group?.key === key) + 1

				return at === 0 ? current : [...current.slice(0, at), ...children, ...current.slice(at)]
			})
		})
	}

	// With `manual`, the server groups the rows: `rows` holds the group headers
	// and the rows of each group that opened.
	return (
		<Grid
			columns={orderColumns}
			rows={rows}
			getKey={(row) => row.id}
			loading={loading}
			groupBy={{
				manual: true,
				value: groupedBy,
				onValueChange: regroup,
				groupRow,
				groupButton: true,
				expanded,
				onExpandedChange: setExpanded,
				onGroupExpand: loadChildren,
			}}
		/>
	)
}
