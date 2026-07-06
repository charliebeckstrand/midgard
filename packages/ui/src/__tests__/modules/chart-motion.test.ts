import { describe, expect, it } from 'vitest'
import { barGrow, referenceRise } from '../../modules/chart/chart-motion'

// One orientation predicate drives every value-axis mount reveal, so the bar
// grow and the reference rise always agree on which screen axis is the value
// axis: y when vertical (bottom-to-top), x when horizontal (left-to-right).

describe('referenceRise', () => {
	it('rises up the y axis from the baseline offset when vertical', () => {
		// A positive offset seats the rule below its value; it animates up to rest.
		expect(referenceRise('vertical', 120)).toEqual({ initial: { y: 120 }, animate: { y: 0 } })
	})

	it('slides in along the x axis from the left when horizontal', () => {
		// A negative offset seats the rule left of its value; it animates right to rest.
		expect(referenceRise('horizontal', -80)).toEqual({ initial: { x: -80 }, animate: { x: 0 } })
	})
})

describe('barGrow', () => {
	it('grows up the y axis, origin at the bottom for a positive bar', () => {
		expect(barGrow('vertical', true)).toEqual({
			initial: { scaleY: 0 },
			animate: { scaleY: 1 },
			style: { originY: 1 },
		})
	})

	it('flips the vertical origin to the top for a negative bar', () => {
		expect(barGrow('vertical', false)).toEqual({
			initial: { scaleY: 0 },
			animate: { scaleY: 1 },
			style: { originY: 0 },
		})
	})

	it('grows along the x axis, origin at the left for a positive bar', () => {
		expect(barGrow('horizontal', true)).toEqual({
			initial: { scaleX: 0 },
			animate: { scaleX: 1 },
			style: { originX: 0 },
		})
	})

	it('flips the horizontal origin to the right for a negative bar', () => {
		expect(barGrow('horizontal', false)).toEqual({
			initial: { scaleX: 0 },
			animate: { scaleX: 1 },
			style: { originX: 1 },
		})
	})
})
