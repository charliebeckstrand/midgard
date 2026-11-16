// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density/steps'
import { k as menu } from '../../recipes/kata/menu'
import { dan } from '../../recipes/kiso/dan'
import { findSteps } from '../helpers/class-stops'

// Menu separator invariant.
//
// The rule of a menu separator starts and ends where the content of a row starts
// and ends, so its inline margin is the inline padding of a row. The space on
// each side of the rule is the space between the content of two rows. Thus its
// block margin is the block padding of a row, plus the space between the edge of
// the line and the icon (0.5), plus the `space-y-0.5` gap between two rows
// (0.5). If the padding of a row changes, the case fails and names the step.

/** The space between the line of a row and its icon, plus the gap between two rows. */
const OFFSET = 1

/** The name of the property that holds the block margin of the separator. */
const PROPERTY = '/[--ui-menu-separator]'

describe('Menu separator space', () => {
	const rowX = findSteps([dan.space.menu.item.x], 'density-px-')

	const rowY = findSteps([dan.space.option.y], 'density-py-')

	const x = findSteps([dan.space.menu.separator.x], 'density-mx-')

	const y = findSteps([dan.space.menu.separator.y.replace(PROPERTY, '')], 'density-set-')

	it('reads the block margin through a plain margin', () => {
		expect(dan.space.menu.separator.y.endsWith(PROPERTY)).toBe(true)

		expect(menu().separator.split(' ')).toContain('my-(--ui-menu-separator)')
	})

	for (const step of densitySteps) {
		it(`lines the rule up with the row content at ${step}`, () => {
			expect(Number(x[step])).toBe(Number(rowX[step]))
		})

		it(`gives the rule the space between two rows at ${step}`, () => {
			expect(Number(y[step])).toBe(Number(rowY[step]) + OFFSET)
		})
	}
})
