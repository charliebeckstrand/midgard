// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density/steps'
import { k as menu } from '../../recipes/kata/menu'
import { dan } from '../../recipes/kiso/dan'
import { findSteps } from '../helpers/class-stops'

// Menu heading inset invariant.
//
// The header of a menu panel and the heading of a section sit above the rows.
// Each takes the inline padding of a row, so its text lines up with the row
// text at each step of the density scope of the panel. If one of them takes a
// fixed padding, the text lines up only at one step, and the case names the
// steps where it does not.

describe('Menu heading inset', () => {
	const row = findSteps([dan.space.menu.item.x], 'density-px-')

	const slots = { header: menu().header.base, heading: menu().heading }

	for (const [name, classes] of Object.entries(slots)) {
		const inset = findSteps([classes], 'density-px-')

		for (const step of densitySteps) {
			it(`lines the ${name} up with the row text at ${step}`, () => {
				expect(inset[step]).toBe(row[step])
			})
		}
	}
})
