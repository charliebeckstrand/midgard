import { useMemo, useState } from 'react'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { type IntlShape, useIntl } from 'ui/primitives/intl'
import { Sparkline } from 'ui/sparkline'

type NumberFormat = Parameters<IntlShape['formatNumber']>[1]

// The current value of a metric is a number, with the format of its kind.
type Metric = { id: number; name: string; current: number; format: NumberFormat; trend: number[] }

const metrics: Metric[] = [
	{
		id: 1,
		name: 'Revenue',
		current: 48_200,
		format: { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 },
		trend: [12, 14, 13, 18, 22, 21, 27, 30, 28, 34, 39, 44],
	},
	{
		id: 2,
		name: 'Signups',
		current: 1204,
		format: {},
		trend: [40, 38, 42, 35, 33, 30, 34, 28, 25, 27, 22, 19],
	},
	{
		id: 3,
		name: 'Latency',
		current: 128,
		format: { style: 'unit', unit: 'millisecond' },
		trend: [8, 9, 7, 11, 6, 12, 5, 10, 7, 9, 6, 8],
	},
	{
		id: 4,
		name: 'Errors',
		current: 0.004,
		format: { style: 'percent', maximumFractionDigits: 1 },
		trend: [2, 1, 3, 1, 0, 2, 1, 4, 1, 0, 1, 0],
	},
]

// A sparkline is the content of a cell. The `value` of a chart column is the
// last period, so its header sorts. The key changes with the sort, so each
// sparkline draws again in the new order.
function sparklineColumns(sortKey: string, intl: IntlShape): GridColumn<Metric>[] {
	return [
		{ id: 'name', title: 'Metric', cell: (row) => row.name },
		{
			id: 'current',
			title: 'Current',
			cell: (row) => intl.formatNumber(row.current, row.format),
		},
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
	const intl = useIntl()

	const [sort, setSort] = useState<GridSortState[]>([])

	const columns = useMemo(() => sparklineColumns(JSON.stringify(sort), intl), [sort, intl])

	return (
		<Grid
			columns={columns}
			rows={metrics}
			getKey={(row) => row.id}
			sort={{ value: sort, onValueChange: setSort }}
		/>
	)
}
