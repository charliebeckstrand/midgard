import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { PivotTable } from '../components/pivot-table'
import { makeShipments } from './fixtures'

// Pivot table's cost comes from groupValues (O(n) over data) and the nested
// aggregation pass over rows × columns. Benchmarks vary both source row count
// and the resulting pivot dimensions.

const rows1k = makeShipments(1_000)
const rows10k = makeShipments(10_000)
const rows50k = makeShipments(50_000)

describe('PivotTable · lane × period (10 × 12 cells)', () => {
	bench('1,000 source rows', () => {
		render(
			<PivotTable
				data={rows1k}
				rowKey="lane"
				columnKey="period"
				valueKey="loads"
				aggregation="sum"
			/>,
		)

		cleanup()
	})

	bench('10,000 source rows', () => {
		render(
			<PivotTable
				data={rows10k}
				rowKey="lane"
				columnKey="period"
				valueKey="loads"
				aggregation="sum"
			/>,
		)

		cleanup()
	})

	bench('50,000 source rows', () => {
		render(
			<PivotTable
				data={rows50k}
				rowKey="lane"
				columnKey="period"
				valueKey="loads"
				aggregation="sum"
			/>,
		)

		cleanup()
	})
})

describe('PivotTable · carrier × destination × totals', () => {
	bench('10,000 rows · totals="both"', () => {
		render(
			<PivotTable
				data={rows10k}
				rowKey="carrier"
				columnKey="destination"
				valueKey="weight"
				aggregation="avg"
				totals="both"
			/>,
		)

		cleanup()
	})

	bench('10,000 rows · totals="none"', () => {
		render(
			<PivotTable
				data={rows10k}
				rowKey="carrier"
				columnKey="destination"
				valueKey="weight"
				aggregation="avg"
				totals="none"
			/>,
		)

		cleanup()
	})
})

describe('PivotTable · aggregation comparison (10k rows)', () => {
	for (const aggregation of ['sum', 'count', 'avg', 'min', 'max'] as const) {
		bench(`aggregation="${aggregation}"`, () => {
			render(
				<PivotTable
					data={rows10k}
					rowKey="lane"
					columnKey="period"
					valueKey="loads"
					aggregation={aggregation}
				/>,
			)

			cleanup()
		})
	}
})
