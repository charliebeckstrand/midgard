/**
 * PivotTable's cost comes from `groupValues` (O(n) over the source data) and
 * the nested aggregation pass over rows × columns, so the scenarios vary both
 * the source row count and the resulting pivot dimensions. The aggregation
 * sweep holds the data fixed and varies only the reducer, isolating what each
 * one costs over the same grouping.
 */

import { describe } from 'vitest'
import { PivotTable } from '../components/pivot-table'
import { shipments } from './fixtures'
import { mountBenches } from './harness'

const LANE_BY_PERIOD = { row: 'lane', column: 'period', value: 'loads' } as const

const CARRIER_BY_DESTINATION = { row: 'carrier', column: 'destination', value: 'weight' } as const

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [1_000, 10_000, 50_000].map((count) => ({ count, rows: shipments(count) }))

const rows10k = shipments(10_000)

describe('PivotTable · lane × period (10 × 12 cells)', () => {
	mountBenches(
		SIZES,
		({ count }) => `${count.toLocaleString()} source rows`,
		({ rows }) => <PivotTable rows={rows} keys={LANE_BY_PERIOD} aggregation="sum" />,
	)
})

describe('PivotTable · carrier × destination × totals', () => {
	mountBenches(
		['both', 'none'] as const,
		(totals) => `10,000 rows · totals="${totals}"`,
		(totals) => (
			<PivotTable rows={rows10k} keys={CARRIER_BY_DESTINATION} aggregation="avg" totals={totals} />
		),
	)
})

describe('PivotTable · aggregation comparison (10k rows)', () => {
	mountBenches(
		['sum', 'count', 'avg', 'min', 'max'] as const,
		(aggregation) => `aggregation="${aggregation}"`,
		(aggregation) => <PivotTable rows={rows10k} keys={LANE_BY_PERIOD} aggregation={aggregation} />,
	)
})
