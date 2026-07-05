import { describe, expect, it } from 'vitest'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { bySlot, fireEvent, renderUI } from '../helpers'

type Row = { day: string; hour: string; commits: number }

const ROWS: Row[] = [
	{ day: 'Mon', hour: '9', commits: 1 },
	{ day: 'Mon', hour: '10', commits: 9 },
	{ day: 'Tue', hour: '9', commits: 5 },
	// (Tue, 10) omitted — a no-data cell.
]

const RANGE = ['#f7fee7', '#365314']

const SERIES = [
	{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: RANGE, colorName: 'Commits' },
] satisfies HeatmapChartSeries<Row>[]

const cellRects = (container: HTMLElement) =>
	Array.from(container.querySelectorAll('[data-slot="heatmap-cells"] rect'))

describe('HeatmapChart', () => {
	it('draws one cell per grid slot, shaded from the series colorRange', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		// 2 rows × 2 columns.
		const rects = cellRects(container)

		expect(rects).toHaveLength(4)

		// Finite cells carry an inline fill; the low and high values differ.
		const fills = rects.map((rect) => rect.getAttribute('fill'))

		expect(fills.filter(Boolean).length).toBe(3)

		expect(fills[0]).not.toBe(fills[1])

		// The missing (Tue, 10) pair takes the neutral no-data fill, not a scale colour.
		const noData = rects.find((rect) => rect.getAttribute('fill') === null)

		expect(noData?.getAttribute('class')).toContain('fill-zinc')
	})

	it('carries full value parity in the visually-hidden table', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const table = bySlot(container, 'chart-table')

		expect(table).not.toBeNull()

		// Row headers are the x categories; the em-dash marks the absent cell.
		expect(table?.textContent).toContain('Mon')

		expect(table?.textContent).toContain('—')
	})

	it('names the plot and renders the range legend by default', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits per day" data={ROWS} series={SERIES} width={400} />,
		)

		expect(bySlot(container, 'heatmap-plot')?.getAttribute('aria-label')).toBe('Commits per day')

		// The shared range legend paints the colorRange as an inline gradient bar.
		expect(bySlot(container, 'heatmap-range-track')?.getAttribute('style')).toContain(
			'linear-gradient',
		)
	})

	it('drops the legend when legend is false', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} legend={false} />,
		)

		expect(bySlot(container, 'heatmap-legend-box')).toBeNull()
	})

	it('dims cells outside the probed bin on range-legend hover', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track).not.toBeNull()

		const dimmed = () =>
			cellRects(container).filter((rect) => rect.getAttribute('class')?.includes('opacity-25'))
				.length

		// Nothing dims until the bar is probed.
		expect(dimmed()).toBe(0)

		fireEvent.pointerMove(track as Element, { clientY: 10 })

		// Cells outside the probed class dim — the reciprocal of the choropleth's map filter.
		expect(dimmed()).toBeGreaterThan(0)

		fireEvent.pointerLeave(track as Element)

		expect(dimmed()).toBe(0)
	})
})
