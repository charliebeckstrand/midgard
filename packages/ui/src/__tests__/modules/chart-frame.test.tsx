import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	GUTTER_GAP,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from '../../modules/chart/chart-constants'
import { ChartFrame } from '../../modules/chart/chart-frame'
import { bandAnchors, plotRect } from '../../modules/chart/chart-layout'
import { bandScale } from '../../modules/chart/chart-scale'
import { bySlot, renderUI } from '../helpers'

const PLOT = { x: 40, y: 8, width: 360, height: 200 }

function frame(width: number, extras?: Partial<Parameters<typeof ChartFrame>[0]>) {
	return (
		<ChartFrame
			label={{ 'aria-label': 'Revenue by quarter' }}
			ref={createRef<HTMLDivElement>()}
			width={width}
			height={240}
			plot={PLOT}
			legend={[{ label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect' }]}
			readout={{
				categories: ['Q1', 'Q2'],
				rows: [
					{ label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect', values: ['1', '2'] },
				],
			}}
			anchors={[]}
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
	it('reserves the label gutter and axis band', () => {
		const plot = plotRect(400, 240, true, ['0', '1,000'])

		expect(plot.x).toBe(Math.round(5 * TICK_CHAR_WIDTH) + GUTTER_GAP)

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
