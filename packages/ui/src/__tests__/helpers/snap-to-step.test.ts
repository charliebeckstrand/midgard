import { describe, expect, it } from 'vitest'
import { snapToStep } from '../../helpers/snap-to-step'

describe('snapToStep', () => {
	it('snaps a value down to the nearest step', () => {
		expect(snapToStep(7, 0, 5)).toBe(5)
	})

	it('snaps a value up to the nearest step', () => {
		expect(snapToStep(8, 0, 5)).toBe(10)
	})

	it('offsets the step grid by min', () => {
		expect(snapToStep(13, 3, 5)).toBe(13)
	})
})
