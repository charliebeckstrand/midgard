import { useMemo, useState } from 'react'
import { Sparkline } from '../../../../components/sparkline'
import { Stack } from '../../../../components/stack'
import { Grid, type GridColumn, type SortState } from '../../../../modules/grid'
import { code, Example } from '../../../engine'

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
// column's `cell` and hand it the row's series. Both chart columns declare a
// `value` (the latest period) so their headers sort, and both `animate` — the
// line draws itself and the area fades in, the bars rise from the baseline, each
// honouring reduced-motion. The `key={sortKey}` re-keys every sparkline on the
// active sort: a sort remounts the cells, so the marks redraw as the rows settle
// into their new order (without it, memoized rows that keep their place — the top
// row after a sort that doesn't move it — would hold their drawn state). Both
// read the same per-row `trend`, and each carries a summarizing `aria-label`
// since the chart is `role="img"`.
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
					variant="bar"
					color="green"
					animate
					aria-label={`${row.name} by period, last 12 periods`}
				/>
			),
		},
	]
}

const SparklineExample = () => {
	// A controlled sort so the cell renderers can key each sparkline on it: sorting
	// flips `sortKey`, remounting every sparkline so it redraws in the new order.
	const [sort, setSort] = useState<SortState[]>([])

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

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="In-cell sparklines"
				code={code`{ value: (r) => r.trend.at(-1), cell: (r) => <Sparkline key={sortKey} data={r.trend} animate /> }`}
			>
				<SparklineExample />
			</Example>
		</Stack>
	)
}
