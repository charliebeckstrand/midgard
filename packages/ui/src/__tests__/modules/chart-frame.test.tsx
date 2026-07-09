import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	LABEL_CHAR_WIDTH,
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
					items={[{ index: 0, label: 'Revenue', swatchClass: 'bg-blue-600', swatch: 'rect' }]}
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

		// The widest label is 5 chars; the gutter rounds the count up to an even 6,
		// so a one-character magnitude swing never shifts the plot.
		expect(plot.x).toBe(Math.ceil(6 * TICK_CHAR_WIDTH) + GUTTER_GAP + GUTTER_EDGE_PAD)

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

	it('widens the gutter for proportional labels passed a wider char width', () => {
		// Digit ticks size the gutter at TICK_CHAR_WIDTH; proportional category
		// labels (the heatmap's rows) pass the wider LABEL_CHAR_WIDTH so a
		// capital-initial label clears the frame edge instead of clipping.
		const digits = plotRect(400, 240, true, ['Wed'])

		const labels = plotRect(400, 240, true, ['Wed'], LABEL_CHAR_WIDTH)

		// 'Wed' is 3 chars; the gutter rounds the count up to an even 4 either way.
		expect(digits.x).toBe(Math.ceil(4 * TICK_CHAR_WIDTH) + GUTTER_GAP + GUTTER_EDGE_PAD)

		expect(labels.x).toBe(Math.ceil(4 * LABEL_CHAR_WIDTH) + GUTTER_GAP + GUTTER_EDGE_PAD)

		expect(labels.x).toBeGreaterThan(digits.x)
	})

	it('holds the gutter across a one-character change in the widest label', () => {
		// A nice-tick axis topping out at 8,000 (5 chars) and one at 40,000 (6)
		// reserve the same gutter, so switching between two charts in a tile — or a
		// filter shifting the magnitude by a digit — never slides the plot and its
		// right-anchored labels sideways.
		const thousands = plotRect(400, 240, true, ['0', '8,000'])

		const tenThousands = plotRect(400, 240, true, ['0', '40,000'])

		expect(tenThousands.x).toBe(thousands.x)
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
		value: { domainValues: [0, 40, 80], format: (value) => String(value) },
		categories: ['Q1', 'Q2'],
		count: 2,
		visibleValues: [{ values: [40, 80], side: 'left', index: 0 }],
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

	it('names the series behind each snap stop, aligned to the points through a gap', () => {
		// Series 0 drops out at the second category, so its stop vanishes there; the
		// positions and the series map must drop it from the very same slot, or the
		// keyboard cursor would read the surviving series against the wrong lane.
		const gapped: CartesianLayoutInput = {
			...input,
			count: 2,
			categories: ['Q1', 'Q2'],
			visibleValues: [
				{ values: [40, null], side: 'left', index: 0 },
				{ values: [60, 80], side: 'left', index: 1 },
			],
		}

		const layout = verticalLayout(gapped)

		// Q1 carries both series in order; Q2 keeps only series 1 — the same slot the
		// position map drops, so a stop and its series index stay paired.
		expect(layout.snapSeries).toEqual([[0, 1], [1]])

		expect(layout.snapPoints[1]).toHaveLength(1)

		expect(layout.snapSeries[1]).toHaveLength(layout.snapPoints[1]?.length ?? 0)
	})

	it('insets the horizontal value axis so its centered end labels clear the frame', () => {
		// Wide currency-style ticks (0 … 6,000) on a narrow frame — the last label
		// centered on the plot's right edge is exactly what overhangs the SVG clip.
		const layout = horizontalLayout({
			...input,
			frameWidth: 480,
			value: {
				domainValues: [0, 4820, 6000],
				format: (value) => value.toLocaleString('en-US'),
			},
			categories: ['Search', 'Direct'],
		})

		const halfLabel = (tick: { label: string }) => (tick.label.length * TICK_CHAR_WIDTH) / 2

		const first = layout.valueTicks.at(0)

		const last = layout.valueTicks.at(-1)

		// Both end labels stay within [0, frameWidth] rather than spilling past the edge.
		expect((first?.at ?? 0) - halfLabel(first ?? { label: '' })).toBeGreaterThanOrEqual(0)

		expect((last?.at ?? 0) + halfLabel(last ?? { label: '' })).toBeLessThanOrEqual(480)

		// The inset pulls the ceiling tick off the plot's right edge.
		expect(last?.at ?? 0).toBeLessThan(layout.plot.x + layout.plot.width)
	})
})
