// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as combobox } from '../../recipes/kata/combobox'
import { k as option } from '../../recipes/kata/option'
import { findSteps } from '../helpers/class-stops'

/**
 * The text of a list panel takes the step of the panel. A panel with a `size` is a density scope,
 * and its options step their text in it. The empty message of a Combobox shows in place of the
 * options, so it steps the same way.
 */
describe('list panel text', () => {
	it('steps the empty message of a Combobox as an option', () => {
		const empty = findSteps([combobox().empty], 'density-text-')

		expect(empty).toEqual(findSteps([option().base], 'density-text-'))
	})
})
