import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from '../../modules/chart/chart-constants'
import { ChartFrame } from '../../modules/chart/chart-frame'
import {
	bandAnchors,
	chartFillsContainer,
	plotRect,
	resolveChartSizing,
} from '../../modules/chart/chart-layout'
import { ChartLegend } from '../../modules/chart/chart-legend'
import { bandScale } from '../../modules/chart/chart-scale'
import { bySlot, noop, renderUI } from '../helpers'

const PLOT = { x: 40, y: 8, width: 360, height: 200 }

function frame(width: number, extras?: Partial<Parameters<typeof ChartFrame>[0]>) {
	return (
		<ChartFrame
			aria-label="Revenue by quarter"
			ref={createRef<HTMLDivElement>()}
			width={width}
			height={240}
			reserveAspect={null}
			plot={PLOT}
			legend={
				<ChartLegend
					items={[{ label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect' }]}
					hidden={new Set()}
					onToggle={noop}
					onFocus={noop}
				/>
			}
			readout={{
				categories: ['Q1', 'Q2'],
				rows: [
					{ label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect', values: ['1', '2'] },
				],
			}}
			tooltip={true}
			{...extras}
		>
			<rect data-slot="chart-mark" />
		</ChartFrame>
	)
}

describe('ChartFrame', () => {
	it('names the plot region and keeps the SVG decorative', () => {
		const { container } = renderUI(frame(400))

		const plot = bySlot(container, 'chart-plot')

		expect(plot).toHaveAttribute('role', 'img')

		expect(plot).toHaveAttribute('aria-label', 'Revenue by quarter')

		expect(plot?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
	})

	it('keeps the legend and data table outside the image region', () => {
		const { container } = renderUI(frame(400))

		const plot = bySlot(container, 'chart-plot')

		expect(bySlot(container, 'chart-legend')).not.toBeNull()

		expect(plot?.contains(bySlot(container, 'chart-legend'))).toBe(false)

		expect(plot?.contains(bySlot(container, 'chart-table'))).toBe(false)

		// The hidden table carries the values the tooltip would show.
		expect(bySlot(container, 'chart-table')?.textContent).toContain('Q2')
	})

	it('renders the frame shell without an SVG until a width is known', () => {
		const { container } = renderUI(frame(0))

		expect(bySlot(container, 'chart-plot')?.querySelector('svg')).toBeNull()

		expect(bySlot(container, 'chart-table')).not.toBeNull()
	})

	it('omits the legend row when the chart passes none', () => {
		const { container } = renderUI(frame(400, { legend: null }))

		expect(bySlot(container, 'chart-legend')).toBeNull()
	})
})

describe('plotRect', () => {
	it('reserves the label gutter and axis band with edge slack', () => {
		const plot = plotRect(400, 240, true, ['0', '1,000'])

		expect(plot.x).toBe(Math.ceil(5 * TICK_CHAR_WIDTH) + GUTTER_GAP + GUTTER_EDGE_PAD)

		expect(plot.y).toBe(PLOT_TOP_PAD)

		expect(plot.width).toBe(400 - plot.x)

		expect(plot.height).toBe(240 - PLOT_TOP_PAD - X_AXIS_HEIGHT)
	})

	it('collapses the reservations without axes', () => {
		const plot = plotRect(400, 240, false, [])

		expect(plot.x).toBe(0)

		expect(plot.width).toBe(400)

		expect(plot.height).toBe(240 - PLOT_TOP_PAD)
	})
})

describe('resolveChartSizing', () => {
	it('derives the height from the width and reserves the same ratio', () => {
		expect(resolveChartSizing(320, undefined, '16/9', 0)).toEqual({
			height: 180,
			reserveAspect: 16 / 9,
		})

		expect(resolveChartSizing(300, undefined, 1, 0)).toEqual({ height: 300, reserveAspect: 1 })

		expect(resolveChartSizing(400, undefined, 2, 0)).toEqual({ height: 200, reserveAspect: 2 })
	})

	it('lets an explicit height win with nothing to reserve', () => {
		expect(resolveChartSizing(320, 240, '16/9', 0)).toEqual({ height: 240, reserveAspect: null })
	})

	it('fills the container height and reserves nothing when the ratio is off', () => {
		expect(resolveChartSizing(320, undefined, false, 275)).toEqual({
			height: 275,
			reserveAspect: null,
		})
	})

	it('yields no height until the width is measured, still reserving the ratio', () => {
		expect(resolveChartSizing(0, undefined, '16/9', 0)).toEqual({
			height: 0,
			reserveAspect: 16 / 9,
		})
	})
})

describe('chartFillsContainer', () => {
	it('is true only when the height is free-form: no explicit height and no ratio', () => {
		expect(chartFillsContainer(undefined, false)).toBe(true)

		// The ratio derives the height from the width, so the container is ignored.
		expect(chartFillsContainer(undefined, '16/9')).toBe(false)

		expect(chartFillsContainer(undefined, 1)).toBe(false)

		// An explicit height fixes the box; a zero/negative ratio is off, but the
		// explicit height still wins over the container.
		expect(chartFillsContainer(240, false)).toBe(false)

		expect(chartFillsContainer(240, '16/9')).toBe(false)
	})

	it('mirrors resolveChartSizing reading the container height', () => {
		// The container height feeds the sizing exactly when the predicate holds.
		expect(resolveChartSizing(320, undefined, false, 275).height).toBe(275)

		expect(chartFillsContainer(undefined, false)).toBe(true)

		expect(resolveChartSizing(320, undefined, '16/9', 275).height).not.toBe(275)

		expect(chartFillsContainer(undefined, '16/9')).toBe(false)
	})
})

describe('bandAnchors', () => {
	it('anchors each category at its band center on the plot top', () => {
		const band = bandScale({ count: 2, range: [PLOT.x, PLOT.x + PLOT.width] })

		const anchors = bandAnchors(band, 2, PLOT)

		expect(anchors).toEqual([
			{ x: band.center(0), y: PLOT.y },
			{ x: band.center(1), y: PLOT.y },
		])
	})
})
