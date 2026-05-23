import { describe, expect, it } from 'vitest'

import { affixStepDown } from '../../../primitives/affix/affix'
import type { Step } from '../../../recipes'
import { control } from '../../../recipes/genkei/control'
import { k as button } from '../../../recipes/kata/button'

// Affix has-button compensation invariant.
//
// Equidistance: affix padding equals `input.px` so a text affix's
// *content* sits the same distance from chrome as input-text does in
// an affix-less control.
//
// When a non-bare button lives in the slot, the affix padding shrinks
// by the button's `pl` so the button's *content* lands at the same
// position. `affixStepDown` moves the slot button one notch down per
// host density step. Both scales grow 0.5 per notch, so the increments
// cancel and the compensation collapses to a constant:
//
//   affix.pl(has-button) = input.px − button.p[affixStepDown(step)] = 1
//
// The test parses live recipe values rather than the literal `1` — if
// any of (input.px, button.p, affixStepDown) drifts, the assertion
// fails with the calculated delta and points at the source.

const SPACING_RE = /calc\(--spacing\(([\d.]+)\)/

function findSpacing(classes: readonly unknown[], prefix: string): number {
	for (const cls of classes.flat(Number.POSITIVE_INFINITY)) {
		if (typeof cls !== 'string') continue
		if (!cls.startsWith(prefix)) continue

		const match = cls.match(SPACING_RE)
		if (match) return Number(match[1])
	}

	throw new Error(`No class starting with "${prefix}" found in: ${JSON.stringify(classes)}`)
}

const STEPS = ['sm', 'md', 'lg'] as const satisfies readonly Step[]

describe('control affix has-button compensation', () => {
	for (const step of STEPS) {
		const buttonSize = affixStepDown(step)
		const hostPx = findSpacing(control.density[step], 'px-[')
		const buttonClasses = button.config.variants.size?.[buttonSize] as readonly unknown[]
		const buttonPx = findSpacing(buttonClasses, 'p-[')
		const expected = hostPx - buttonPx

		it(`${step}: affix.prefix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.prefix[step],
				'has-[button:not([data-variant=bare])]:pl-[',
			)

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.suffix[step],
				'has-[button:not([data-variant=bare])]:pr-[',
			)

			expect(actual).toBe(expected)
		})
	}

	it('the compensation collapses to a constant across all density steps (the lockstep guarantee)', () => {
		const deltas = STEPS.map((step) => {
			const buttonSize = affixStepDown(step)
			const hostPx = findSpacing(control.density[step], 'px-[')
			const buttonClasses = button.config.variants.size?.[buttonSize] as readonly unknown[]
			const buttonPx = findSpacing(buttonClasses, 'p-[')

			return hostPx - buttonPx
		})

		expect(new Set(deltas).size).toBe(1)
	})
})
