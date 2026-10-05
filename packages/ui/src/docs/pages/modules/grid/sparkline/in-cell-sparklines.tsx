import { useMemo, useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { Sparkline } from 'ui/sparkline'

type Metric = { id: number; name: string; total: string; trend: number[] }

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

// A sparkline is the content of a cell. The `value` of a chart column is the
// last period, so its header sorts. The key changes with the sort, so each
// sparkline draws again in the new order.
function sparklineColumns(sortKey: string): GridColumn<Metric>[] {
	return [
		{ id: 'name', title: 'Metric', cell: (row) => row.name },
		{ id: 'total', title: 'Total', cell: (row) => row.total },
		{
			id: 'trend',
			title: 'Trend',
			value: (row) => row.trend.at(-1) ?? 0,
			cell: (row) => (
				<Sparkline
					key={sortKey}
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
			value: (row) => row.trend.at(-1) ?? 0,
			cell: (row) => (
				<Sparkline
					key={sortKey}
					data={row.trend}
					shape="bar"
					color="green"
					animate
					aria-label={`${row.name} by period, last 12 periods`}
				/>
			),
		},
	]
}

export default function InCellSparklines() {
	const [sort, setSort] = useState<GridSortState[]>([])

	const columns = useMemo(() => sparklineColumns(JSON.stringify(sort)), [sort])

	return (
		<Grid
			columns={columns}
			rows={metrics}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}
