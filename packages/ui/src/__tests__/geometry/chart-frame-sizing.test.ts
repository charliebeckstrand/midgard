// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	GUTTER_EDGE_PAD,
	GUTTER_GAP,
	GUTTER_LABEL_ROOM,
	GUTTER_MAX,
	PLOT_TOP_PAD,
	TICK_CHAR_WIDTH,
	X_AXIS_HEIGHT,
} from '../../modules/chart/engine/chart-constants'
import { chartFrameLayout, chartFrameSizing } from '../../modules/chart/engine/chart-frame/sizing'
import { plotRect } from '../../modules/chart/engine/chart-layout'

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

	it('sizes the gutter from the drawn width of proportional labels', () => {
		// A proportional label passes its drawn width. The widest label ends
		// GUTTER_GAP before the plot and starts at the frame edge.
		const width = (label: string) => (label === 'Wednesday' ? 61.4 : 20)

		const plot = plotRect(400, 240, true, ['Mon', 'Wednesday'], width)

		expect(plot.x).toBe(62 + GUTTER_GAP)

		expect(plot.width).toBe(400 - plot.x)
	})

	it('caps the gutter of proportional labels at GUTTER_MAX', () => {
		const plot = plotRect(400, 240, true, ['Organic search'], () => 200)

		expect(plot.x).toBe(GUTTER_MAX)

		// A label cut to the room fills the gutter and does not pass it.
		expect(plotRect(400, 240, true, ['Organic…'], () => GUTTER_LABEL_ROOM).x).toBe(GUTTER_MAX)
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

	it('rejects a negative "w/h" ratio, filling rather than reserving a negative box', () => {
		// `'-4/3'` is a well-typed prop value, so it must fall through to fill the
		// way its numeric twin does.
		expect(chartFrameSizing(undefined, '-4/3')).toEqual({ mode: 'fill' })

		expect(chartFrameSizing(undefined, -4 / 3)).toEqual({ mode: 'fill' })
	})
})

describe('chartFrameLayout', () => {
	it('carries a live ratio on the figure, and on the plot box beside a legend', () => {
		expect(chartFrameLayout(undefined, '16/9', false)).toEqual({
			sizing: { mode: 'aspect-fill', ratio: 16 / 9 },
			outerAspect: 16 / 9,
		})

		expect(chartFrameLayout(undefined, '16/9', true)).toEqual({
			sizing: { mode: 'aspect', ratio: 16 / 9 },
			outerAspect: null,
		})
	})

	// The figure carries `outerAspect` as a CSS `aspect-ratio` and the plot
	// resolves its height from the ratio, so a negative one would both drop the
	// declaration and give the drawing a negative `viewBox` height.
	it('rejects a negative "w/h" ratio on both the figure and the plot box', () => {
		expect(chartFrameLayout(undefined, '-4/3', false)).toEqual({
			sizing: { mode: 'fill' },
			outerAspect: null,
		})

		expect(chartFrameLayout(undefined, '-4/3', true)).toEqual({
			sizing: { mode: 'fill' },
			outerAspect: null,
		})
	})
})
