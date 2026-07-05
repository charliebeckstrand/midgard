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

	it('outlines the probed class with an ink chosen for contrast against each cell', () => {
		const { container } = renderUI(
			<HeatmapChart aria-label="Commits" data={ROWS} series={SERIES} width={400} />,
		)

		const track = bySlot(container, 'heatmap-range-track')

		expect(track).not.toBeNull()

		// jsdom reports a zero box, which collapses the probe to NaN; stand in a real
		// track so a probe resolves to a real class. The bar runs low (bottom) to
		// high (top): RANGE is [light, dark], so the top class is dark, the bottom light.
		;(track as Element).getBoundingClientRect = () =>
			({
				top: 0,
				left: 0,
				bottom: 160,
				right: 20,
				width: 20,
				height: 160,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}) as DOMRect

		const outlined = () =>
			cellRects(container).filter((rect) => rect.getAttribute('stroke') !== null)

		// Probe the top (dark) class — a dark cell needs a light ring to read.
		fireEvent.pointerMove(track as Element, { clientY: 4 })

		const onDark = outlined()

		expect(onDark.length).toBeGreaterThan(0)

		for (const rect of onDark) {
			// Light ink, and the outline replaces the dim — a focused cell is never dimmed.
			expect(rect.getAttribute('stroke')).toBe('#ffffff')

			expect(rect.getAttribute('class')).not.toContain('opacity-25')
		}

		// Probe the bottom (light) class — a light cell needs a dark ring instead.
		fireEvent.pointerMove(track as Element, { clientY: 156 })

		const onLight = outlined()

		expect(onLight.length).toBeGreaterThan(0)

		for (const rect of onLight) {
			expect(rect.getAttribute('stroke')).toBe('#18181b')
		}
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
})
