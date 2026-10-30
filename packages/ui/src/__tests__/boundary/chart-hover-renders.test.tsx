import { describe, expect, it, vi } from 'vitest'
import { ChoroplethChart, HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { BarChart } from '../../modules/chart/bar-chart'
import { ChartAxis } from '../../modules/chart/engine/chart-axes/axis'
import { ChartContextMenu } from '../../modules/chart/engine/chart-context-menu'
import { ChartHeader } from '../../modules/chart/engine/chart-header'
import { ChartLegend } from '../../modules/chart/engine/chart-legend/legend'
import { RangeArrow } from '../../modules/chart/engine/chart-legend/range-legend'
import { useChartPointer } from '../../modules/chart/engine/use-chart-pointer'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	SectorChartMarks,
	SectorSegmentLabels,
} from '../../modules/chart/sector-chart/sector-chart-marks'
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
vi.mock('../../modules/chart/engine/chart-header', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-header')>()

	return { ...actual, ChartHeader: vi.fn(actual.ChartHeader) }
})

vi.mock('../../modules/chart/engine/use-chart-pointer', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/use-chart-pointer')>()

	return { ...actual, useChartPointer: vi.fn(actual.useChartPointer) }
})

vi.mock('../../modules/chart/sector-chart/sector-chart-marks', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/sector-chart/sector-chart-marks')>()

	return {
		...actual,
		SectorChartMarks: vi.fn(actual.SectorChartMarks),
		SectorSegmentLabels: vi.fn(actual.SectorSegmentLabels),
	}
})

vi.mock('../../modules/chart/engine/chart-axes/axis', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-axes/axis')>()

	return { ...actual, ChartAxis: vi.fn(actual.ChartAxis) }
})

vi.mock('../../modules/chart/engine/chart-legend/legend', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-legend/legend')>()

	return { ...actual, ChartLegend: vi.fn(actual.ChartLegend) }
})

vi.mock('../../modules/chart/engine/chart-legend/range-legend', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-legend/range-legend')>()

	return { ...actual, RangeArrow: vi.fn(actual.RangeArrow) }
})

vi.mock('../../modules/chart/engine/chart-context-menu', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/chart/engine/chart-context-menu')>()

	return { ...actual, ChartContextMenu: vi.fn(actual.ChartContextMenu) }
})

/** The mock that counts the renders of each part. */
const parts = {
	header: ChartHeader,
	pointer: useChartPointer,
	slices: SectorChartMarks,
	segmentLabels: SectorSegmentLabels,
	axis: ChartAxis,
	legend: ChartLegend,
	menu: ChartContextMenu,
	arrow: RangeArrow,
}

type Part = keyof typeof parts

/** The renders of `part` since the last {@link resetRenders}. */
function renders(part: Part): number {
	return vi.mocked(parts[part]).mock.calls.length
}

/** Starts a new count for each part. */
function resetRenders() {
	for (const part of Object.values(parts)) vi.mocked(part).mockClear()
}

/** Checks that each count fired on mount, so a later `toBe(0)` can fail. */
const expectLive = vi.defineHelper((...keys: Part[]) => {
	for (const key of keys) expect(renders(key), key).toBeGreaterThan(0)
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

type Cell = { day: string; hour: string; commits: number }

const HEATMAP_SERIES = [
	{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#f7fee7', '#365314'] },
] satisfies [HeatmapChartSeries<Cell>]

/** Mounts a heatmap, gives its hit layer `BOX`, and moves the pointer into the first cell. */
function heatmap() {
	const { container } = renderUI(
		<HeatmapChart
			aria-label="Commits"
			data={[
				{ day: 'Mon', hour: '9', commits: 1 },
				{ day: 'Mon', hour: '10', commits: 9 },
				{ day: 'Tue', hour: '9', commits: 5 },
			]}
			series={HEATMAP_SERIES}
			width={400}
		/>,
	)

	const hit = getSlot(container, 'chart-hit')

	hit.getBoundingClientRect = () => BOX

	fireEvent.pointerMove(hit, { clientX: 130, clientY: 70 })

	return { container, hit }
}

describe('Chart hover renders', () => {
	it('tracks the pointer inside a bar without a render of the frame or the hit rect', () => {
		const { container } = renderUI(bars())

		const hit = getSlot(container, 'chart-hit')

		// The entry lands on the revenue bar of Q3. That crossing changes the
		// pointed mark, which the frame owns, so it can render the frame once.
		fireEvent.pointerMove(hit, { clientX: 280, clientY: 100 })

		expectLive('header', 'pointer')

		resetRenders()

		// 50 moves that stay on the same bar. Each one moves the tooltip.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 276 + (step % 9), clientY: 96 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		expect(renders('header')).toBe(0)

		// The hit rect reads nothing from the hover state.
		expect(renders('pointer')).toBe(0)
	})

	it('holds the legend and the axes through a sweep over the bars', async () => {
		const { container } = renderUI(bars({ legend: true }))

		await act(async () => {})

		const hit = getSlot(container, 'chart-hit')

		expectLive('legend', 'axis')

		resetRenders()

		for (let x = 20; x < 400; x += 10) {
			fireEvent.pointerMove(hit, { clientX: x, clientY: 100 })
		}

		fireEvent.pointerLeave(hit)

		await act(async () => {})

		expect(renders('legend')).toBe(0)

		expect(renders('axis')).toBe(0)

		// The hit rect writes the pointed mark through a setter that keeps its
		// identity, so a crossing from bar to bar does not render it.
		expect(renders('pointer')).toBe(0)
	})

	it('holds the legend while the pointer rests on a reference rule', async () => {
		const { container } = renderUI(
			bars({ legend: true, reference: [{ value: 50, label: 'Target' }] }),
		)

		await act(async () => {})

		expectLive('legend')

		resetRenders()

		const rule = getSlot(container, 'chart-reference-line')

		act(() => {
			fireEvent.pointerEnter(rule)
		})

		// The marks recede to the rule, and the legend, which writes the same
		// emphasis, does not render for it.
		expect(getSlot(container, 'chart-marks').getAttribute('class')).toContain('opacity-25')

		act(() => {
			fireEvent.pointerLeave(rule)
		})

		await act(async () => {})

		expect(renders('legend')).toBe(0)
	})

	it('holds the axes through a legend hover', async () => {
		const { container } = renderUI(bars({ legend: true }))

		await act(async () => {})

		expectLive('axis')

		resetRenders()

		const entry = allBySlot(container, 'chart-legend-item')[1] as HTMLElement

		act(() => {
			fireEvent.pointerEnter(entry)
		})

		act(() => {
			fireEvent.pointerLeave(entry)
		})

		await act(async () => {})

		expect(renders('axis')).toBe(0)
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

		expectLive('header', 'slices', 'segmentLabels')

		resetRenders()

		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(first as Element, {
				clientX: 150 + (step % 9),
				clientY: 60 + (step % 7),
			})
		}

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Search')

		expect(renders('header')).toBe(0)

		expect(renders('slices')).toBe(0)

		expect(renders('segmentLabels')).toBe(0)
	})

	it('tracks the pointer across a heatmap without a render of the chart body', () => {
		const { container, hit } = heatmap()

		expectLive('axis', 'pointer')

		resetRenders()

		// The moves cross from cell to cell.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 110 + step * 4, clientY: 70 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		expect(renders('axis')).toBe(0)

		// The hit layer writes the hover and reads nothing from it.
		expect(renders('pointer')).toBe(0)
	})

	it('holds the range arrow while the pointer moves inside one heatmap cell', () => {
		const { container, hit } = heatmap()

		expectLive('arrow', 'pointer')

		resetRenders()

		// The moves stay inside the first cell, so the pointed value holds.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 120 + (step % 9), clientY: 70 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		expect(renders('arrow')).toBe(0)

		expect(renders('pointer')).toBe(0)
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

		expectLive('menu')

		resetRenders()

		for (let step = 0; step < 50; step += 1) {
			const region = regions[step % regions.length] as Element

			fireEvent.pointerMove(region, { clientX: 40 + step, clientY: 20 + (step % 5) })
		}

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		expect(renders('menu')).toBe(0)
	})
})
