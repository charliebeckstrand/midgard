// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dan } from '../../recipes/kiso'

/** The values of the stepped class of a property, from `xs` to `xl`. */
const steps = (classes: string, property: string) => {
	const match = new RegExp(`density-${property}-\\[([^\\]]+)\\]`).exec(classes)

	return match?.[1]?.split(',').map(Number)
}

/**
 * The grip of a column resize handle sits at the center of the handle, on the line where the
 * header label and the body values clip. That line is one inline cell padding in from the edge, so
 * the handle and the end padding of a resizable header are twice the cell padding at each step.
 */
describe('resize handle ramp', () => {
	const cell = steps(dan.space.cell.x, 'px')?.map((value) => value * 2)

	it('makes the handle twice the inline cell padding', () => {
		expect(steps(dan.size.resize.handle, 'w')).toEqual(cell)
	})

	it('makes the end padding of a resizable header twice the inline cell padding', () => {
		expect(steps(dan.space.resize.end, 'pe')).toEqual(cell)
	})
})
