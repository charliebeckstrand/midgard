// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density/steps'
import { k as menu } from '../../recipes/kata/menu'
import { dan } from '../../recipes/kiso/dan'
import { panel } from '../../recipes/kiso/panel'
import { findSteps } from '../helpers/class-stops'

// Menu sheet gutter invariant.
//
// On a phone, a dropdown menu opens as a drawer. The heading of the drawer takes
// the panel inset. A row takes the gutter of the body plus its own inline
// padding. The gutter is the inset less the padding of a row, so the row text
// lines up with the heading at each step. If the inset or the padding of a row
// changes, the case fails and names the step.

describe('Menu sheet gutter', () => {
	const inset = findSteps([panel.layout.inset.x], 'density-px-')

	const row = findSteps([dan.space.menu.item.x], 'density-px-')

	const gutter = findSteps([menu.sheet.body], 'density-px-')

	for (const step of densitySteps) {
		it(`lines the rows up with the heading at ${step}`, () => {
			expect(Number(gutter[step]) + Number(row[step])).toBe(Number(inset[step]))
		})
	}
})
