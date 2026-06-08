import { describe, expect, it } from 'vitest'

import { affixStepDown } from '../../../primitives/affix/affix'
import type { Step } from '../../../recipes'
import { k as button } from '../../../recipes/kata/button'
import { control } from '../../../recipes/kiso/control'

// Affix `data-slot` compensation invariant.
//
// A plain-text affix aligns its content with the input text: padding equals
// `input.px`. When the slot hosts an element with its own outer chrome — a
// non-bare Button or a Badge, matched on `data-slot` — the affix padding
// shrinks to a constant `1.5` spacing-units at every density step, pulling
// the chip's *content* 0.5 units inside the text-equidistance line. The
// constant holds across density steps: `affixStepDown` moves the child one
// notch down per host step, and both scales grow 0.5 per notch — the
// per-step deltas cancel, leaving only the 0.5 inset:
//
//   affix.pl(has-chip) = input.px − child.p[affixStepDown(step)] + 0.5 = 1.5
//
// The test parses live recipe values rather than the literal `1.5` — if
// any of (input.px, button.p, affixStepDown, or the 0.5 inset) drifts,
// the assertion fails with the calculated delta and points at the source.
// Button's `p` stands in for any chip's `p`; Button and Badge share the
// same per-step horizontal padding scale (kasane.p).

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

const CHIP_INSET = 0.5

describe('control affix has-button compensation', () => {
	for (const step of STEPS) {
		const buttonSize = affixStepDown(step)

		const hostPx = findSpacing(control.density[step], 'px-[')

		const buttonClasses = button.config.variants.size?.[buttonSize] as readonly unknown[]

		const buttonPx = findSpacing(buttonClasses, 'p-[')

		const expected = hostPx - buttonPx + CHIP_INSET

		it(`${step}: affix.prefix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.prefix[step],
				'has-[[data-slot=button]:not([data-variant=bare])]:pl-[',
			)

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.suffix[step],
				'has-[[data-slot=button]:not([data-variant=bare])]:pr-[',
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
