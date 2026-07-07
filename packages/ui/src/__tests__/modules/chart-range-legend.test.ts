import { describe, expect, it } from 'vitest'
import { rangeLegendOrientation, resolveRangeLegend } from '../../modules/chart/chart-range-legend'
import { COMPACT_WIDTH, SPARK_HEIGHT, SPARK_WIDTH } from '../../modules/chart/chart-tier'

// A roomy, non-spark, non-narrow box the placement passes through untouched.
const WIDE = 500
const TALL = 400

describe('rangeLegendOrientation', () => {
	it('stands a side placement vertical and a stacked one horizontal', () => {
		expect(rangeLegendOrientation('left')).toBe('vertical')
		expect(rangeLegendOrientation('right')).toBe('vertical')
		expect(rangeLegendOrientation('top')).toBe('horizontal')
		expect(rangeLegendOrientation('bottom')).toBe('horizontal')
	})
})

describe('resolveRangeLegend', () => {
	it('defaults to a vertical bar on the right', () => {
		expect(resolveRangeLegend(undefined, WIDE, TALL)).toEqual({
			show: true,
			placement: 'right',
			orientation: 'vertical',
		})

		expect(resolveRangeLegend(true, WIDE, TALL)).toEqual({
			show: true,
			placement: 'right',
			orientation: 'vertical',
		})
	})

	it('honours an explicit default placement', () => {
		expect(resolveRangeLegend(undefined, WIDE, TALL, 'bottom')).toMatchObject({
			placement: 'bottom',
			orientation: 'horizontal',
		})
	})

	it('drops the bar when legend is false', () => {
		expect(resolveRangeLegend(false, WIDE, TALL).show).toBe(false)
	})

	it('takes a bare placement string and lays it out by orientation', () => {
		expect(resolveRangeLegend('bottom', WIDE, TALL)).toEqual({
			show: true,
			placement: 'bottom',
			orientation: 'horizontal',
		})

		expect(resolveRangeLegend('left', WIDE, TALL)).toEqual({
			show: true,
			placement: 'left',
			orientation: 'vertical',
		})
	})

	it('takes the { type, placement } object form', () => {
		expect(resolveRangeLegend({ type: 'range', placement: 'top' }, WIDE, TALL)).toMatchObject({
			placement: 'top',
			orientation: 'horizontal',
		})

		// An object without a placement falls back to the default.
		expect(resolveRangeLegend({ type: 'range' }, WIDE, TALL, 'left')).toMatchObject({
			placement: 'left',
			orientation: 'vertical',
		})
	})

	it('sheds the bar at the spark floor, whichever axis crosses it', () => {
		expect(resolveRangeLegend(true, SPARK_WIDTH - 1, TALL).show).toBe(false)
		expect(resolveRangeLegend(true, WIDE, SPARK_HEIGHT - 1).show).toBe(false)
	})

	it('drops a side placement to a horizontal bottom row in a box too narrow for a rail', () => {
		// Under the compact width but above the spark floor: a side rail can't fit, so
		// the bar becomes a horizontal row under the plot.
		const narrow = resolveRangeLegend('right', COMPACT_WIDTH - 1, TALL)

		expect(narrow).toEqual({ show: true, placement: 'bottom', orientation: 'horizontal' })

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
})
