// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps, stepDown } from '../../core/density'
import { k as button } from '../../recipes/kata/button'
import { k as queryChips } from '../../recipes/kata/query-chips'
import { findSteps } from '../helpers/class-stops'

// QueryChips combinator-button pad invariant.
//
// `combinator.button` of `kata/query-chips.ts` copies the stepped pad, the
// labeled `py`, and the radius of the Button kata, one step down. The Button
// has no `size`, so it takes the step of the row, and these classes replace
// its own stepped lists. This holds each copy against the live Button kata at
// each step. If the Button kata changes a list, the case fails and names the
// step, so the combinator does not drift.

const SHIFTED = densitySteps

const LISTS = ['density-p-ring-', 'data-has-label:density-py-ring-', 'density-rounded-'] as const

describe('QueryChips combinator-button pad', () => {
	for (const prefix of LISTS) {
		const own = findSteps(queryChips.combinator.button, prefix)

		const source = findSteps([button.config.base], prefix)

		for (const step of SHIFTED) {
			it(`${prefix}: the ${step} value is the Button value at ${stepDown(step)}`, () => {
				expect(own[step]).toBe(source[stepDown(step)])
			})
		}
	}
})
