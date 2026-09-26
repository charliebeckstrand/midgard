import { describe, expect, it, vi } from 'vitest'
import { ChoroplethChart, HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { act, allBySlot, allRegions, bySlot, fireEvent, getSlot, renderUI } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

// Each count reads the renders of one part of a chart:
//
// - The frame builds the header on each of its renders.
// - The bar hit rect calls `useChartPointer` once for each of its renders.
// - The heatmap body builds its axes, and the choropleth body builds its
//   context menu, on each of their renders.
//
// The suite holds per-file module mocks, so it lives here and runs on a fork
// (`test-isolation-boundary.test.ts`).
const renders = vi.hoisted(() => ({
	header: 0,
	pointer: 0,
	slices: 0,
	segmentLabels: 0,
	axis: 0,
	legend: 0,
	menu: 0,
}))

function resetRenders() {
	for (const key of Object.keys(renders) as (keyof typeof renders)[]) renders[key] = 0
}

vi.mock('../../modules/chart/engine/chart-header', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-header')>()

	return {
		...actual,
		ChartHeader: (props: Parameters<typeof actual.ChartHeader>[0]) => {
			renders.header += 1

			return actual.ChartHeader(props)
		},
	}
})

vi.mock('../../modules/chart/engine/use-chart-pointer', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/use-chart-pointer')>()

	return {
		...actual,
		useChartPointer: (...args: Parameters<typeof actual.useChartPointer>) => {
			renders.pointer += 1

			return actual.useChartPointer(...args)
		},
	}
})

vi.mock('../../modules/chart/sector-chart/sector-chart-marks', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/sector-chart/sector-chart-marks')>()

	return {
		...actual,
		SectorChartMarks: (props: Parameters<typeof actual.SectorChartMarks>[0]) => {
			renders.slices += 1

			return actual.SectorChartMarks(props)
		},
		SectorSegmentLabels: (props: Parameters<typeof actual.SectorSegmentLabels>[0]) => {
			renders.segmentLabels += 1

			return actual.SectorSegmentLabels(props)
		},
	}
})

vi.mock('../../modules/chart/engine/chart-axes/axis', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-axes/axis')>()

	return {
		...actual,
		ChartAxis: (props: Parameters<typeof actual.ChartAxis>[0]) => {
			renders.axis += 1

			return actual.ChartAxis(props)
		},
	}
})

vi.mock('../../modules/chart/engine/chart-legend/legend', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-legend/legend')>()

	return {
		...actual,
		ChartLegend: (props: Parameters<typeof actual.ChartLegend>[0]) => {
			renders.legend += 1

			return actual.ChartLegend(props)
		},
	}
})

vi.mock('../../modules/chart/engine/chart-context-menu', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-context-menu')>()

	return {
		...actual,
		ChartContextMenu: (props: Parameters<typeof actual.ChartContextMenu>[0]) => {
			renders.menu += 1

			return actual.ChartContextMenu(props)
		},
	}
})

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

function bars(extra?: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			title="Revenue"
			data={DATA}
			series={[
				{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
			]}
			width={400}
			{...extra}
		/>
	)
}

/** A screen box for a hit layer, because jsdom gives each element a zero box. */
const BOX = {
	left: 100,
	top: 50,
	right: 340,
	bottom: 210,
	width: 240,
	height: 160,
	x: 100,
	y: 50,
	toJSON: () => ({}),
} as DOMRect

describe('Chart hover renders', () => {
	it('tracks the pointer inside a bar without a render of the frame or the hit rect', () => {
		const { container } = renderUI(bars())

		const hit = getSlot(container, 'chart-hit')

		// The entry lands on the revenue bar of Q3. That crossing changes the
		// pointed mark, which the frame owns, so it can render the frame once.
		fireEvent.pointerMove(hit, { clientX: 280, clientY: 100 })

		resetRenders()

		// 50 moves that stay on the same bar. Each one moves the tooltip.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 276 + (step % 9), clientY: 96 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		expect(renders.header).toBe(0)

		// The hit rect reads nothing from the hover state.
		expect(renders.pointer).toBe(0)
	})

	it('holds the legend and the axes through a sweep over the bars', async () => {
		const { container } = renderUI(bars({ legend: true }))

		await act(async () => {})

		const hit = getSlot(container, 'chart-hit')

		resetRenders()

		for (let x = 20; x < 400; x += 10) {
			fireEvent.pointerMove(hit, { clientX: x, clientY: 100 })
		}

		fireEvent.pointerLeave(hit)

		await act(async () => {})

		expect(renders.legend).toBe(0)

		expect(renders.axis).toBe(0)
	})

	it('holds the axes through a legend hover', async () => {
		const { container } = renderUI(bars({ legend: true }))

		await act(async () => {})

		resetRenders()

		const entry = allBySlot(container, 'chart-legend-item')[1] as HTMLElement

		act(() => {
			fireEvent.pointerEnter(entry)
		})

		act(() => {
			fireEvent.pointerLeave(entry)
		})

		await act(async () => {})

		expect(renders.axis).toBe(0)
	})

	it('tracks the pointer inside a slice without a render of the frame or the slices', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Traffic"
				title="Traffic"
				data={[
					{ source: 'Search', visits: 60 },
					{ source: 'Direct', visits: 25 },
					{ source: 'Referral', visits: 15 },
				]}
				series={[{ xKey: 'source', yKey: 'visits' }]}
				labels={{ segment: true }}
				width={300}
				height={200}
			/>,
		)

		const [first] = allBySlot(container, 'chart-slice')

		fireEvent.pointerEnter(first as Element)

		resetRenders()

		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(first as Element, {
				clientX: 150 + (step % 9),
				clientY: 60 + (step % 7),
			})
		}

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Search')

		expect(renders.header).toBe(0)

		expect(renders.slices).toBe(0)

		expect(renders.segmentLabels).toBe(0)
	})

	it('tracks the pointer across a heatmap without a render of the chart body', () => {
		type Row = { day: string; hour: string; commits: number }

		const series = [
			{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#f7fee7', '#365314'] },
		] satisfies [HeatmapChartSeries<Row>]

		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={[
					{ day: 'Mon', hour: '9', commits: 1 },
					{ day: 'Mon', hour: '10', commits: 9 },
					{ day: 'Tue', hour: '9', commits: 5 },
				]}
				series={series}
				width={400}
			/>,
		)

		const hit = getSlot(container, 'heatmap-hit')

		hit.getBoundingClientRect = () => BOX

		fireEvent.pointerMove(hit, { clientX: 130, clientY: 70 })

		resetRenders()

		// The moves cross from cell to cell.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 110 + step * 4, clientY: 70 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		expect(renders.axis).toBe(0)
	})

	it('tracks the pointer across choropleth regions without a render of the chart body', () => {
		const { container } = renderUI(
			<ChoroplethChart
				aria-label="Population"
				geography={FIXTURE_GEOJSON}
				data={[
					{ region: 'A', pop: 0 },
					{ region: 'B', pop: 50 },
					{ region: 'C', pop: 100 },
				]}
				series={[{ idKey: 'region', colorKey: 'pop', colorRange: ['#dbeafe', '#1e3a8a'] }]}
				width={400}
			/>,
		)

		const regions = allRegions(container)

		resetRenders()

		for (let step = 0; step < 50; step += 1) {
			const region = regions[step % regions.length] as Element

			fireEvent.pointerMove(region, { clientX: 40 + step, clientY: 20 + (step % 5) })
		}

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		expect(renders.menu).toBe(0)
	})
})
