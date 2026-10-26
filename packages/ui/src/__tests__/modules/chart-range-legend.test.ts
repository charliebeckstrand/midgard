// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	rangeLegendBeside,
	resolveRangeLegend,
} from '../../modules/chart/engine/chart-legend/range'
import { COMPACT_WIDTH, SPARK_HEIGHT, SPARK_WIDTH } from '../../modules/chart/engine/chart-tier'

// A roomy, non-spark, non-narrow box the placement passes through untouched.
const WIDE = 500
const TALL = 400

describe('resolveRangeLegend', () => {
	// A side placement stands vertical, and a stacked one lies horizontal.
	it.each([
		['left', 'sm', 'vertical'],
		['right', 'sm', 'vertical'],
		['top', undefined, 'horizontal'],
		['bottom', undefined, 'horizontal'],
	] as const)(
		'takes the bare placement %s, aside %s, and lays it out %s',
		(placement, aside, orientation) => {
			expect(resolveRangeLegend(placement, WIDE, TALL)).toEqual({
				show: true,
				placement,
				aside,
				orientation,
			})
		},
	)

	it('defaults to a vertical bar on the right', () => {
		expect(resolveRangeLegend(undefined, WIDE, TALL)).toEqual({
			show: true,
			placement: 'right',
			aside: 'sm',
			orientation: 'vertical',
		})

		expect(resolveRangeLegend(true, WIDE, TALL)).toEqual({
			show: true,
			placement: 'right',
			aside: 'sm',
			orientation: 'vertical',
		})
	})

	it('honors an explicit default placement', () => {
		expect(resolveRangeLegend(undefined, WIDE, TALL, 'bottom')).toMatchObject({
			placement: 'bottom',
			orientation: 'horizontal',
		})
	})

	it('drops the bar when legend is false', () => {
		expect(resolveRangeLegend(false, WIDE, TALL).show).toBe(false)
	})

	it('takes the { placement } object form', () => {
		expect(resolveRangeLegend({ placement: 'top' }, WIDE, TALL)).toMatchObject({
			placement: 'top',
			orientation: 'horizontal',
		})

		// An object without a placement falls back to the default.
		expect(resolveRangeLegend({}, WIDE, TALL, 'left')).toMatchObject({
			placement: 'left',
			orientation: 'vertical',
		})
	})

	it('sheds the bar at the spark floor, whichever axis crosses it', () => {
		expect(resolveRangeLegend(true, SPARK_WIDTH - 1, TALL).show).toBe(false)
		expect(resolveRangeLegend(true, WIDE, SPARK_HEIGHT - 1).show).toBe(false)
	})

	it('keeps a side placement in a box too narrow for a rail, and announces it horizontal', () => {
		// Under the compact width but above the spark floor: the frame's CSS stacks
		// the bar as a horizontal row under the plot. The placement stays put, so
		// the layout never waits on the measurement. Only the announced axis reads it.
		const narrow = resolveRangeLegend('right', COMPACT_WIDTH - 1, TALL)

		expect(narrow).toEqual({
			show: true,
			placement: 'right',
			aside: 'sm',
			orientation: 'horizontal',
		})

		// A stacked placement is already horizontal and stays where it was asked.
		expect(resolveRangeLegend('top', COMPACT_WIDTH - 1, TALL)).toMatchObject({
			placement: 'top',
			orientation: 'horizontal',
		})
	})

	it('keeps a side placement standing once the box is wide enough for a rail', () => {
		expect(resolveRangeLegend('right', COMPACT_WIDTH, TALL)).toMatchObject({
			placement: 'right',
			orientation: 'vertical',
		})
	})

	it('resolves the same placement on both sides of the spark boundary', () => {
		// In a narrow box, the shed bar and the shown bar must agree on placement:
		// a placement that flipped with `show` would rebuild the frame around the
		// plot, and the remount's transient measurements can feed back into this
		// resolution and oscillate it (the choropleth's resize crash).
		const shown = resolveRangeLegend('right', COMPACT_WIDTH - 2, TALL)

		const shed = resolveRangeLegend('right', COMPACT_WIDTH - 2, SPARK_HEIGHT - 1)

		expect(shown.show).toBe(true)

		expect(shed.show).toBe(false)

		expect(shed.placement).toBe(shown.placement)

		expect(shed.orientation).toBe(shown.orientation)
	})

	it('keeps the requested placement and reserves the bar while the box is unmeasured', () => {
		// Width 0 means "not yet measured", not "too narrow": the request stands AND
		// the bar shows, so the frame's structure holds steady from first paint to
		// measurement. Shedding on unmeasured would mount the rail only once the
		// container measure landed (a transition after the plot's own pre-paint
		// measure) so the plot would paint full-width first and visibly shrink when
		// the rail arrived (the choropleth's draw-big-then-shrink).
		expect(resolveRangeLegend('right', 0, 0)).toMatchObject({
			show: true,
			placement: 'right',
			orientation: 'vertical',
		})

		// An explicit `false` still wins: unmeasured reserves, it doesn't force.
		expect(resolveRangeLegend(false, 0, 0).show).toBe(false)
	})

	it('reads the breakpoint of the frame that hosts the bar', () => {
		// The map frame puts a side legend beside the map from `@lg` (512px).
		expect(resolveRangeLegend('right', WIDE, TALL, 'right', 'lg')).toEqual({
			show: true,
			placement: 'right',
			aside: 'lg',
			orientation: 'horizontal',
		})

		expect(resolveRangeLegend('right', 512, TALL, 'right', 'lg').orientation).toBe('vertical')
	})
})

describe('rangeLegendBeside', () => {
	it('sits a side bar beside the plot from the breakpoint, and while unmeasured', () => {
		expect(rangeLegendBeside('right', COMPACT_WIDTH)).toBe(true)

		expect(rangeLegendBeside('right', COMPACT_WIDTH - 1)).toBe(false)

		expect(rangeLegendBeside('right', 0)).toBe(true)

		expect(rangeLegendBeside('bottom', WIDE)).toBe(false)

		expect(rangeLegendBeside(undefined, 500, 'right', 'lg')).toBe(false)
	})
})
