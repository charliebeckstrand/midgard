/**
 * PivotTable's cost comes from `groupValues` (O(n) over the source data) and
 * the nested aggregation pass over rows × columns, so the scenarios vary both
 * the source row count and the resulting pivot dimensions. The aggregation
 * sweep holds the data fixed and varies only the reducer, isolating what each
 * one costs over the same grouping.
 */

import { PivotTable } from '../components/pivot-table'
import { compareBenches } from './compare'
import { shipments } from './fixtures'
import { mountBenches } from './harness'

const LANE_BY_PERIOD = { row: 'lane', column: 'period', value: 'loads' } as const

const CARRIER_BY_DESTINATION = { row: 'carrier', column: 'destination', value: 'weight' } as const

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [1_000, 10_000, 50_000].map((count) => shipments(count))

compareBenches('PivotTable · lane × period (10 × 12 cells)', (bench) => {
	mountBenches(
		bench,
		SIZES,
		(rows) => `${rows.length.toLocaleString()} source rows`,
		(rows) => <PivotTable rows={rows} keys={LANE_BY_PERIOD} aggregation="sum" />,
	)
})

compareBenches('PivotTable · carrier × destination × totals', (bench) => {
	mountBenches(
		bench,
		['both', 'none'] as const,
		(totals) => `10,000 rows · totals="${totals}"`,
		(totals) => (
			<PivotTable
				rows={shipments(10_000)}
				keys={CARRIER_BY_DESTINATION}
				aggregation="avg"
				totals={totals}
			/>
		),
	)
})

compareBenches('PivotTable · aggregation comparison (10k rows)', (bench) => {
	mountBenches(
		bench,
		['sum', 'count', 'avg', 'min', 'max'] as const,
		(aggregation) => `aggregation="${aggregation}"`,
		(aggregation) => (
			<PivotTable rows={shipments(10_000)} keys={LANE_BY_PERIOD} aggregation={aggregation} />
		),
	)
})
