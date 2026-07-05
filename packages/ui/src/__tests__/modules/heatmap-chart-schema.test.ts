import { describe, expect, it } from 'vitest'
import {
	type HeatmapChartSeries,
	resolveHeatmapMatrix,
} from '../../modules/chart/heatmap-chart/heatmap-chart-schema'

type Row = { day: string; hour: string; commits: number }

const ROWS: Row[] = [
	{ day: 'Mon', hour: '9', commits: 3 },
	{ day: 'Mon', hour: '10', commits: 5 },
	{ day: 'Tue', hour: '9', commits: 2 },
]

const SERIES = {
	xKey: 'hour',
	yKey: 'day',
	colorKey: 'commits',
	colorRange: ['#fff', '#000'],
} satisfies HeatmapChartSeries<Row>

describe('resolveHeatmapMatrix', () => {
	it('pivots flat rows onto axes in first-seen order', () => {
		const matrix = resolveHeatmapMatrix(ROWS, SERIES)

		expect(matrix.columns).toEqual(['9', '10'])

		expect(matrix.rows).toEqual(['Mon', 'Tue'])

		expect(matrix.values).toEqual([
			[3, 5],
			[2, null],
		])
	})

	it('leaves an absent pair null and coerces a non-finite value to null', () => {
		const matrix = resolveHeatmapMatrix(
			[
				{ day: 'Mon', hour: '9', commits: 3 },
				{ day: 'Tue', hour: '10', commits: Number.NaN },
			],
			SERIES,
		)

		expect(matrix.values).toEqual([
			[3, null],
			[null, null],
		])
	})

	it('takes the last write on a repeated cell', () => {
		const matrix = resolveHeatmapMatrix(
			[
				{ day: 'Mon', hour: '9', commits: 3 },
				{ day: 'Mon', hour: '9', commits: 8 },
			],
			SERIES,
		)

		expect(matrix.values).toEqual([[8]])
	})
})
