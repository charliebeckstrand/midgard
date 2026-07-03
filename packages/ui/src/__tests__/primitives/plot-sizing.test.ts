import { describe, expect, it } from 'vitest'
import { resolveFrameSizing } from '../../primitives/plot'

describe('resolveFrameSizing', () => {
	it('derives the height from the width and reserves the same ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 320, 0)).toEqual({
			height: 180,
			reserveAspect: 16 / 9,
		})

		expect(resolveFrameSizing({ mode: 'aspect', ratio: 2 }, 400, 0)).toEqual({
			height: 200,
			reserveAspect: 2,
		})
	})

	it('holds a fixed height with nothing to reserve, ignoring the container', () => {
		expect(resolveFrameSizing({ mode: 'fixed', height: 240 }, 320, 275)).toEqual({
			height: 240,
			reserveAspect: null,
		})
	})

	it('fills the container height and reserves nothing when free-form', () => {
		expect(resolveFrameSizing({ mode: 'fill' }, 320, 275)).toEqual({
			height: 275,
			reserveAspect: null,
		})
	})

	it('yields no height until the width is measured, still reserving the ratio', () => {
		expect(resolveFrameSizing({ mode: 'aspect', ratio: 16 / 9 }, 0, 0)).toEqual({
			height: 0,
			reserveAspect: 16 / 9,
		})
	})
})
