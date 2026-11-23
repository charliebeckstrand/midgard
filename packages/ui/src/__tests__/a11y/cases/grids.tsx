import { Grid, type GridColumn } from '../../../modules/grid'
import { noop } from '../../helpers'
import type { Case } from './types'

type Order = { id: number; customer: string; region: string; total: number }

const orders: Order[] = [
	{ id: 1, customer: 'Acme Freight', region: 'West', total: 120 },
	{ id: 2, customer: 'Globex', region: 'East', total: 80 },
	{ id: 3, customer: 'Initech', region: 'West', total: 45 },
	{ id: 4, customer: 'Umbrella', region: 'East', total: 200 },
	{ id: 5, customer: 'Hooli', region: 'North', total: 15 },
]

const getKey = (row: Order) => row.id

/** A manual grouping of the West orders: the group header row, then its leaves. */
const manualRows: Order[] = [
	{ id: 0, customer: 'West', region: '', total: 165 },
	...orders.filter((row) => row.region === 'West'),
]

const columns: GridColumn<Order>[] = [
	{ id: 'customer', title: 'Customer', cell: (row) => row.customer, value: (row) => row.customer },
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{
		id: 'total',
		title: 'Total',
		cell: (row) => row.total,
		value: (row) => row.total,
		aggFunc: 'sum',
	},
]

/**
 * The grid modes that change the role, the row count, or the row indices: a
 * window, a page, a treegrid, master-detail, a column-group band, and a grand
 * total. Each case is axe-gated in the baseline, and
 * `grid-aria-invariants.test.tsx` holds the row-count, row-index, and set
 * invariants over the same cases.
 */
export const gridCases: readonly Case[] = [
	{
		// A window with no cursor: `role="table"` with the full row count.
		name: 'grid, windowed',
		element: (
			<Grid
				key="gw"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={orders}
				getKey={getKey}
				virtualize
				maxHeight="200px"
			/>
		),
	},
	{
		// One page of the rows: `role="table"`, with the indices of the page.
		name: 'grid, paginated',
		element: (
			<Grid
				key="gp"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={orders}
				getKey={getKey}
				pagination={{ defaultValue: { pageIndex: 1, pageSize: 2 } }}
			/>
		),
	},
	{
		// A client grouping under the cursor: a treegrid with a total for each group.
		name: 'grid, treegrid',
		element: (
			<Grid
				key="gt"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={orders}
				getKey={getKey}
				groupBy={{ value: 'region' }}
				groupTotalRow
				navigable
			/>
		),
	},
	{
		// A click handler over a manual grouping roves the rows: a treegrid with
		// no row indices, because each row renders.
		name: 'grid, roving treegrid',
		element: (
			<Grid
				key="gr"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={manualRows}
				getKey={getKey}
				groupBy={{
					manual: true,
					value: 'region',
					groupRow: (row) => (row.id === 0 ? { key: 'west', value: 'West', count: 2 } : null),
					expanded: new Set(['west']),
				}}
				onRowClick={noop}
			/>
		),
	},
	{
		// One open detail panel, which takes a row of the count.
		name: 'grid, master-detail',
		element: (
			<Grid
				key="gd"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={[{ id: 'expand', expander: true }, ...columns]}
				rows={orders}
				getKey={getKey}
				expandable={{
					defaultValue: new Set([2]),
					render: (row) => <p>Shipped to {row.region}</p>,
				}}
				navigable
			/>
		),
	},
	{
		// A column-group band over two columns, with a spacer over the third.
		name: 'grid, column groups',
		element: (
			<Grid
				key="gb"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={orders}
				getKey={getKey}
				columnGroups={[
					{
						id: 'who',
						title: 'Who',
						description: 'The customer and its region',
						columns: ['customer', 'region'],
						collapsible: true,
					},
				]}
				navigable
			/>
		),
	},
	{
		// A grand total row under the body, which takes the last row index.
		name: 'grid, grand total',
		element: (
			<Grid
				key="gg"
				tableProps={{ 'aria-label': 'Orders' }}
				columns={columns}
				rows={orders}
				getKey={getKey}
				grandTotalRow
				navigable
			/>
		),
	},
]
