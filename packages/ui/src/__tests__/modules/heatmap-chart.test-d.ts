import { describe, expectTypeOf, it } from 'vitest'
import type { HeatmapChartProps, HeatmapChartSeries } from '../../modules/chart'

type Row = { day: string; hour: string; commits: number }

/** The props of a heatmap, other than its name. */
type Unnamed = { data: Row[]; series: [HeatmapChartSeries<Row>] }

describe('HeatmapChart', () => {
	it('requires an accessible name', () => {
		// The plot is `role="img"`, so a heatmap with no name must not typecheck.
		expectTypeOf<Unnamed>().not.toExtend<HeatmapChartProps<Row>>()

		expectTypeOf<Unnamed & { 'aria-label': string }>().toExtend<HeatmapChartProps<Row>>()

		expectTypeOf<Unnamed & { 'aria-labelledby': string }>().toExtend<HeatmapChartProps<Row>>()
	})
})
