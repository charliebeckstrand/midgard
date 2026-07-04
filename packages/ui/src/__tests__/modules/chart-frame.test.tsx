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
	type CartesianLayoutInput,
	chartFrameSizing,
	horizontalLayout,
	plotRect,
	verticalLayout,
} from '../../modules/chart/chart-layout'
import { ChartLegend } from '../../modules/chart/chart-legend'
import { bySlot, noop, renderUI } from '../helpers'

function frame(width: number, extras?: Partial<Parameters<typeof ChartFrame>[0]>) {
	return (
		<ChartFrame
			aria-label="Revenue by quarter"
			ref={createRef<HTMLDivElement>()}
			width={width}
			height={240}
			reserve={null}
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

describe('chartFrameSizing', () => {
	it('lets an explicit height win as a fixed pixel box', () => {
		expect(chartFrameSizing(240, '16/9')).toEqual({ mode: 'fixed', height: 240 })

		// The explicit height wins even with the ratio off.
		expect(chartFrameSizing(240, false)).toEqual({ mode: 'fixed', height: 240 })
	})

	it('derives from a live ratio, numeric or "w/h"', () => {
		expect(chartFrameSizing(undefined, '16/9')).toEqual({ mode: 'aspect', ratio: 16 / 9 })

		expect(chartFrameSizing(undefined, 2)).toEqual({ mode: 'aspect', ratio: 2 })
	})

	it('falls to fill when the ratio is off or unparseable', () => {
		expect(chartFrameSizing(undefined, false)).toEqual({ mode: 'fill' })

		expect(chartFrameSizing(undefined, 0)).toEqual({ mode: 'fill' })
	})
})

describe('cartesian layout', () => {
	const input: CartesianLayoutInput = {
		frameWidth: 400,
		frameHeight: 240,
		axes: true,
		tickTarget: 4,
		zeroBaseline: true,
		domainValues: [0, 40, 80],
		categories: ['Q1', 'Q2'],
		format: (value) => String(value),
		count: 2,
		visibleValues: [[40, 80]],
	}

	it('runs value up y and the band across x when vertical', () => {
		const layout = verticalLayout(input)

		// Zero sits on the plot floor; the ceiling tick sits above it.
		expect(layout.baseline).toBeCloseTo(layout.plot.y + layout.plot.height)

		expect(layout.valueTicks.at(-1)?.at).toBeLessThan(layout.baseline)

		// Band centers fall inside the horizontal plot span.
		for (const position of layout.bandPositions) {
			expect(position).toBeGreaterThanOrEqual(layout.plot.x)

			expect(position).toBeLessThanOrEqual(layout.plot.x + layout.plot.width)
		}
	})

	it('runs value along x and the band down y when horizontal', () => {
		const layout = horizontalLayout(input)

		// Zero sits at the left edge; the ceiling tick sits to its right.
		expect(layout.baseline).toBeCloseTo(layout.plot.x)

		expect(layout.valueTicks.at(-1)?.at).toBeGreaterThan(layout.baseline)

		// Band centers fall inside the vertical plot span.
		for (const position of layout.bandPositions) {
			expect(position).toBeGreaterThanOrEqual(layout.plot.y)

			expect(position).toBeLessThanOrEqual(layout.plot.y + layout.plot.height)
		}
	})
})
