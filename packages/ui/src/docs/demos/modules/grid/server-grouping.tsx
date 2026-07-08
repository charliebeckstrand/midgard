import { useCallback, useEffect, useRef, useState } from 'react'
import { Grid, type GridColumn, type GridGroupHeaderRow } from '../../../../modules/grid'

// One row shape serves both kinds the "server" returns: a group-header row
// carries the `group` marker (its key and child count) plus the group's
// aggregates in the same fields a leaf uses, so the aggregating columns read
// backend figures off the header row itself.
type Order = {
	id: string
	country: string
	customer?: string
	orders: number
	revenue: number
	group?: { key: string; count: number }
}

const countries = ['Norway', 'Japan', 'Brazil', 'Canada'] as const

// The mock backend's full dataset, keyed by country — far smaller than the
// real use case (where this side lives behind an API precisely because the
// whole set can't be held in memory), but enough to exercise the flow.
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

// Stand-ins for the server's two queries: the grouped top level (one header
// row per country, carrying the backend-computed count and sums) and one
// group's children. Each resolves after a short delay, like a real fetch.
const fetchGroupRows = (): Promise<Order[]> =>
	new Promise((resolve) => {
		setTimeout(() => {
			resolve(
				countries.map((country) => {
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
		}, 500)
	})

const fetchChildren = (country: string): Promise<Order[]> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(customersByCountry[country] ?? []), 500)
	})

const fetchFlatRows = (): Promise<Order[]> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(Object.values(customersByCountry).flat()), 500)
	})

const dollars = (value: unknown) => `$${Number(value).toLocaleString('en-US')}`

const orderColumns: GridColumn<Order>[] = [
	// `groupable` puts the column in play for the group-by button: its header
	// gains a button that groups on press and ungroups on a second press.
	{
		id: 'country',
		title: 'Country',
		groupable: true,
		cell: (row) => row.country,
		value: (row) => row.country,
	},
	{
		id: 'customer',
		title: 'Customer',
		cell: (row) => row.customer ?? '',
		value: (row) => row.customer,
	},
	{
		id: 'orders',
		title: 'Orders',
		cell: (row) => String(row.orders),
		value: (row) => row.orders,
		aggFunc: 'sum',
	},
	{
		id: 'revenue',
		title: 'Revenue',
		cell: (row) => dollars(row.revenue),
		value: (row) => row.revenue,
		aggFunc: 'sum',
		aggCell: ({ value }) => dollars(value),
	},
]

// The group-header contract: a row the backend marked as a group resolves to
// its descriptor; every other row is a leaf.
const groupRow = (row: Order): GridGroupHeaderRow | null =>
	row.group ? { key: row.group.key, value: row.country, count: row.group.count } : null

// Server-side grouping over a mocked async backend. `manual: true` hands the
// grouping to the "server": `rows` is whatever it returned last — group
// headers with counts and aggregates, plus the children of any group expanded
// so far. Expanding a group fires `onGroupExpand`, which fetches that group's
// children and splices them in after their header; collapse just hides them
// (they stay cached in state). A groupable column's header group-by button
// drives `onValueChange`, which refetches grouped or flat as the grouping
// changes.
export const ServerGroupingExample = () => {
	const [rows, setRows] = useState<Order[]>([])

	const [groupedBy, setGroupedBy] = useState<string | number | null>('country')

	const [expanded, setExpanded] = useState<Set<string | number>>(new Set())

	const [loading, setLoading] = useState(true)

	// Seed the top level once on mount; the ref guard keeps strict mode's
	// double-invoked effect from fetching twice.
	const seededRef = useRef(false)

	useEffect(() => {
		if (seededRef.current) return

		seededRef.current = true

		fetchGroupRows().then((groups) => {
			setRows(groups)

			setLoading(false)
		})
	}, [])

	// Groups whose children have been fetched (collapse keeps them in state, so
	// re-expanding never refetches); reset when the grouping changes.
	const loadedRef = useRef(new Set<string | number>())

	const regroup = useCallback((columnId: string | number | null) => {
		setGroupedBy(columnId)

		setExpanded(new Set())

		loadedRef.current = new Set()

		setLoading(true)

		const request = columnId == null ? fetchFlatRows() : fetchGroupRows()

		request.then((next) => {
			setRows(next)

			setLoading(false)
		})
	}, [])

	const loadChildren = useCallback((key: string | number) => {
		if (loadedRef.current.has(key)) return

		loadedRef.current.add(key)

		fetchChildren(String(key)).then((children) => {
			setRows((current) => {
				const at = current.findIndex((row) => row.group?.key === key) + 1

				if (at === 0) return current

				return [...current.slice(0, at), ...children, ...current.slice(at)]
			})
		})
	}, [])

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
