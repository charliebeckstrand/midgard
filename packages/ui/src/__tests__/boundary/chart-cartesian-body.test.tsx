import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { BarChart } from '../../modules/chart/bar-chart'
import { ComboChart } from '../../modules/chart/combo-chart'
import { seriesMetas } from '../../modules/chart/engine/chart-cartesian/series'
import { barMarks } from '../../modules/chart/engine/chart-geometry/bar'
import { buildLineSeries, lineGeometry } from '../../modules/chart/engine/chart-geometry/line'
import { verticalLayout } from '../../modules/chart/engine/chart-layout'
import { LineChart } from '../../modules/chart/line-chart'
import { act, fireEvent, getSlot, renderUI } from '../helpers'
import { legendItem } from '../helpers/chart-legend'

/**
 * The body of a cartesian chart runs only the work that a change needs.
 *
 * Each run of a vertical cartesian chart body lays out the chart once, so the
 * `verticalLayout` calls count the body runs. The `seriesMetas` calls count the
 * series builds, and the geometry builders count the geometry of each chart
 * body. The counts need module mocks, so this suite sits in `boundary/`.
 */
vi.mock('../../modules/chart/engine/chart-layout', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-layout')>()

	return { ...actual, verticalLayout: vi.fn(actual.verticalLayout) }
})

vi.mock('../../modules/chart/engine/chart-cartesian/series', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-cartesian/series')>()

	return { ...actual, seriesMetas: vi.fn(actual.seriesMetas) }
})

vi.mock('../../modules/chart/engine/chart-geometry/bar', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-geometry/bar')>()

	return { ...actual, barMarks: vi.fn(actual.barMarks) }
})

vi.mock('../../modules/chart/engine/chart-geometry/line', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-geometry/line')>()

	return {
		...actual,
		buildLineSeries: vi.fn(actual.buildLineSeries),
		lineGeometry: vi.fn(actual.lineGeometry),
	}
})

type Row = { week: string; a: number; b: number }

const ROWS = 40

const DATA: Row[] = Array.from({ length: ROWS }, (_, index) => ({
	week: `W${index}`,
	a: index,
	b: ROWS - index,
}))

const OTHER: Row[] = DATA.map((row) => ({ ...row, a: row.a + 5 }))

/** Lets the deferred table and the effects of a change settle. */
async function settle() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50))
	})
}

/** Clears each count. */
function clearCounts() {
	for (const fn of [verticalLayout, seriesMetas, barMarks, buildLineSeries, lineGeometry]) {
		vi.mocked(fn).mockClear()
	}
}

/** A line chart, with a `series` and a `reference` that are new list literals on each call. */
const lineChart = (data: Row[]) => (
	<LineChart
		aria-label="L"
		data={data}
		series={[
			{ xKey: 'week', yKey: 'a', yName: 'A' },
			{ xKey: 'week', yKey: 'b', yName: 'B' },
		]}
		reference={[{ value: 20, label: 'Goal' }]}
		width={400}
	/>
)

/**
 * Each chart, with a `series` and a `reference` that are new list literals on
 * each call, as a caller writes them inline. `geometry` is the builder of the
 * chart body.
 */
const CHARTS: [string, (data: Row[]) => ReactElement, unknown][] = [
	[
		'bar',
		(data) => (
			<BarChart
				aria-label="B"
				data={data}
				series={[
					{ xKey: 'week', yKey: 'a', yName: 'A' },
					{ xKey: 'week', yKey: 'b', yName: 'B' },
				]}
				reference={[{ value: 20, label: 'Goal' }]}
				width={400}
			/>
		),
		barMarks,
	],
	['line', lineChart, buildLineSeries],
	[
		'area',
		(data) => (
			<AreaChart
				aria-label="A"
				data={data}
				series={[
					{ xKey: 'week', yKey: 'a', yName: 'A' },
					{ xKey: 'week', yKey: 'b', yName: 'B' },
				]}
				reference={[{ value: 20, label: 'Goal' }]}
				width={400}
			/>
		),
		lineGeometry,
	],
	[
		'combo',
		(data) => (
			<ComboChart
				aria-label="C"
				data={data}
				series={[
					{ type: 'bar', xKey: 'week', yKey: 'a', yName: 'A' },
					{ type: 'line', xKey: 'week', yKey: 'b', yName: 'B' },
				]}
				reference={[{ value: 20, label: 'Goal' }]}
				width={400}
			/>
		),
		barMarks,
	],
]

describe('cartesian chart body', () => {
	beforeEach(clearCounts)

	it.each(CHARTS)(
		'builds no series and no geometry of the %s chart on a parent render with new list literals',
		async (_, chart, geometry) => {
			const { rerender } = renderUI(chart(DATA))

			await settle()

			clearCounts()

			act(() => rerender(chart(DATA)))

			// The body runs, and the work under it holds.
			expect(vi.mocked(verticalLayout)).toHaveBeenCalledTimes(0)

			expect(vi.mocked(seriesMetas)).not.toHaveBeenCalled()

			expect(vi.mocked(geometry as typeof barMarks)).not.toHaveBeenCalled()
		},
	)

	it.each(CHARTS)('runs the body of the %s chart once on a data update', async (_, chart) => {
		const { rerender } = renderUI(chart(DATA))

		await settle()

		clearCounts()

		act(() => rerender(chart(OTHER)))

		// Without the fix, the readout hold sets state during the render, so the
		// body runs twice.
		expect(vi.mocked(verticalLayout)).toHaveBeenCalledTimes(1)
	})

	it('runs the body of a static chart once on a series toggle', async () => {
		const { container } = renderUI(lineChart(DATA))

		await settle()

		clearCounts()

		act(() => {
			fireEvent.click(legendItem(container, 'B'))
		})

		expect(vi.mocked(verticalLayout)).toHaveBeenCalledTimes(1)
	})

	it('builds the series again when an entry of the series changes', async () => {
		const chart = (color: string) => (
			<BarChart
				aria-label="B"
				data={DATA}
				series={[
					{ xKey: 'week', yKey: 'a', yName: 'A', color },
					{ xKey: 'week', yKey: 'b', yName: 'B' },
				]}
				width={400}
			/>
		)

		const { container, rerender } = renderUI(chart('#ff0000'))

		await settle()

		clearCounts()

		act(() => rerender(chart('#0000ff')))

		expect(vi.mocked(seriesMetas)).toHaveBeenCalled()

		const bar = container.querySelector('[data-slot="chart-bar"]')

		expect(bar?.getAttribute('fill')).toBe('#0000ff')
	})

	it('moves a rule when an entry of the reference changes', async () => {
		const chart = (value: number) => (
			<LineChart
				aria-label="L"
				data={DATA}
				series={[{ xKey: 'week', yKey: 'a', yName: 'A' }]}
				reference={[{ value, label: 'Goal' }]}
				width={400}
			/>
		)

		const { container, rerender } = renderUI(chart(10))

		await settle()

		const rule = () => getSlot(container, 'chart-reference-line').outerHTML

		const before = rule()

		act(() => rerender(chart(30)))

		expect(rule()).not.toBe(before)
	})
})
