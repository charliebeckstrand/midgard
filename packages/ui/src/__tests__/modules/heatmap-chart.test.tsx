import { describe, expect, it } from 'vitest'
import { HeatmapChart, type HeatmapChartSeries } from '../../modules/chart'
import { GUTTER_EDGE_PAD, LABEL_CHAR_WIDTH } from '../../modules/chart/chart-constants'
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

	it('does not leak the unwired animate/texture props onto the plot element', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} animate texture />,
		)

		const plot = bySlot(container, 'heatmap-plot')

		// The grid honours neither, so they must be dropped rather than spread onto
		// the `role="img"` div as invalid DOM attributes.
		expect(plot?.hasAttribute('animate')).toBe(false)

		expect(plot?.hasAttribute('texture')).toBe(false)
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

	it('narrows legend to a boolean — the range bar takes no placement', () => {
		const { container } = renderUI(
			// @ts-expect-error the range bar is fixed beside the plot: it takes a boolean, not a placement
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} legend="bottom" />,
		)

		// The narrowing is the point (the @ts-expect-error above); a placement is
		// still truthy, so at runtime the legend renders on its fixed right side.
		expect(bySlot(container, 'heatmap-legend-box')).not.toBeNull()
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

	it('reserves the y gutter for proportional row labels so the widest clears the frame edge', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		// The left y-axis labels are right-anchored at `plot.x - GUTTER_GAP`, so this
		// x is the widest label's right edge; its left edge is x minus the estimated
		// text width. Rows are 'Mon'/'Tue' (3 chars) — capital-initial day names.
		const label = container.querySelector('[data-slot="chart-axis-y"] text')

		const x = Number(label?.getAttribute('x'))

		// Pinned to the proportional estimate: a regression to TICK_CHAR_WIDTH would
		// drop x below the label's estimated width, pushing its left edge off-frame.
		expect(x).toBe(Math.ceil(3 * LABEL_CHAR_WIDTH) + GUTTER_EDGE_PAD)

		expect(x).toBeGreaterThanOrEqual(3 * LABEL_CHAR_WIDTH)
	})

	it('resolves the cell under the pointer, not one offset by the plot gutter', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const hit = bySlot(container, 'heatmap-hit')

		expect(hit).not.toBeNull()

		// jsdom reports a zero box; stand in a screen rect for the plot so the
		// fraction-across-the-rect math has something to resolve against. The rect
		// starts at (100, 50) — a raw client delta would drop that origin and land
		// on the wrong cell, the bug this guards.
		const box = {
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

		;(hit as Element).getBoundingClientRect = () => box

		// The arrow's `top` encodes the resolved cell's bin (high value → high on the
		// bar → small top%), so it reads back which cell the pointer resolved to.
		const arrowTop = () => {
			const style = bySlot(container, 'heatmap-range-arrow')?.getAttribute('style') ?? ''

			return Number(style.match(/top:\s*([\d.]+)%/)?.[1] ?? Number.NaN)
		}

		// Columns are ['9', '10'], rows ['Mon', 'Tue']: Mon/10 = 9 (the max), Mon/9 = 1 (the min).
		// Top-right cell — the max sits high on the bar.
		fireEvent.pointerMove(hit as Element, { clientX: 330, clientY: 70 })

		const high = arrowTop()

		// Top-left cell — the min sits low on the bar.
		fireEvent.pointerMove(hit as Element, { clientX: 130, clientY: 70 })

		const low = arrowTop()

		expect(Number.isNaN(high)).toBe(false)

		expect(Number.isNaN(low)).toBe(false)

		expect(high).toBeLessThan(low)
	})

	it('pins the pointed cell on click under trigger click, ignoring hover', () => {
		const { container } = renderUI(
			<HeatmapChart
				aria-label="Commits"
				data={ROWS}
				series={SERIES}
				width={400}
				tooltip={{ trigger: 'click' }}
			/>,
		)

		const hit = bySlot(container, 'heatmap-hit') as Element

		// The hit layer reads as clickable.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		// jsdom reports a zero box; stand in a screen rect so the fraction math resolves.
		const box = {
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

		;(hit as Element).getBoundingClientRect = () => box

		// Movement no longer opens the readout under the click trigger.
		fireEvent.pointerMove(hit, { clientX: 330, clientY: 70 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// A click on the top-right cell (Mon/10 = 9) pins its readout.
		fireEvent.click(hit, { clientX: 330, clientY: 70 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Mon')

		expect(tooltip?.textContent).toContain('9')

		// A second click of the same cell dismisses it.
		fireEvent.click(hit, { clientX: 330, clientY: 70 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})
})
