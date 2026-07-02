import { describe, expect, it } from 'vitest'

import { affixStepDown } from '../../primitives/affix/affix'
import type { Ma, Step } from '../../recipes'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { control } from '../../recipes/kiso/control'

// Affix `data-slot` compensation invariant.
//
// A plain-text affix aligns its content with the input text: padding equals
// `input.px`. When the slot hosts an element with its own outer chrome (a
// non-bare Button or a Badge, matched on `data-slot`), the affix padding
// shrinks to a constant `1.5` spacing-units at every density step, pulling
// the chip's *content* 0.5 units inside the text-equidistance line. The
// constant holds across density steps: `affixStepDown` moves the child one
// notch down per host step, and both scales grow 0.5 per notch; the
// per-step deltas cancel, leaving only the 0.5 inset:
//
//   affix.pl(has-chip) = input.px − child.p[affixStepDown(step)] + 0.5 = 1.5
//
// The test parses live recipe values rather than the literal `1.5`; if
// any of (input.px, button.p, affixStepDown, or the 0.5 inset) drifts,
// the assertion fails with the calculated delta and points at the source.
// Badge sits one notch below Button on the shared `px` scale, so its
// override resolves to a different constant (`2`); the has-badge arm
// below pins it directly off `badge.px`.

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

// Affix `data-slot=badge` compensation invariant.
//
// Same geometry as the has-button arm, but Badge sits one notch below
// Button on the shared `px` scale (`kata/badge.ts`), so its stepped-down
// padding is 0.5 smaller and the slot pads 0.5 more — the constant lands
// at `2`, not `1.5`. The test reads `badge.px` directly; if the badge
// scale drifts back into step with Button, the constant moves and the
// assertion names the step.

describe('control affix has-badge compensation', () => {
	for (const step of STEPS) {
		const badgeSize = affixStepDown(step)

		const hostPx = findSpacing(control.density[step], 'px-[')

		const badgeClasses = badge.config.variants.size?.[badgeSize] as readonly unknown[]

		const badgePx = findSpacing(badgeClasses, 'px-[')

		const expected = hostPx - badgePx + CHIP_INSET

		it(`${step}: affix.prefix has-badge override = input.px (${hostPx}) − stepped-down badge.px (${badgePx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findSpacing(control.affix.prefix[step], 'has-[[data-slot=badge]]:pl-[')

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-badge override = input.px (${hostPx}) − stepped-down badge.px (${badgePx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findSpacing(control.affix.suffix[step], 'has-[[data-slot=badge]]:pr-[')

			expect(actual).toBe(expected)
		})
	}

	it('the badge compensation collapses to a constant across all density steps (the lockstep guarantee)', () => {
		const deltas = STEPS.map((step) => {
			const badgeSize = affixStepDown(step)

			const hostPx = findSpacing(control.density[step], 'px-[')

			const badgeClasses = badge.config.variants.size?.[badgeSize] as readonly unknown[]

			const badgePx = findSpacing(badgeClasses, 'px-[')

			return hostPx - badgePx
		})

		expect(new Set(deltas).size).toBe(1)
	})
})

// Affix bare-Button compensation invariant.
//
// A chrome-less icon-only bare Button has no outer box, so its glyph aligns to
// the *text line* (`density.px`), not the chip-content line: there is no 0.5
// chip inset. The override subtracts the button's stepped-down icon-only
// compound padding (`not-data-[has-label]:p-…` in `kata/button.ts`) from
// `density.px`:
//
//   affix.pl(has-bare) = input.px − bare.compound.p[affixStepDown(step)]
//
// Unlike the non-bare arm this cannot collapse to a constant: the bare compound
// scale grows 0.25 per notch (half of `density.px`'s 0.5), so the per-step
// deltas can't cancel and the value drifts (1.75 → 2 → 2.25). The test parses
// the live compound rule rather than the literals; if input.px, the bare
// compound p, or affixStepDown drifts, the assertion points at the source.

const COMPOUND_P_RE = /:p-([\d.]+)$/

function findBareCompoundP(size: Ma): number {
	const rules = button.config.compound as ReadonlyArray<Record<string, unknown>>

	for (const rule of rules) {
		if (rule.variant !== 'bare' || rule.size !== size) continue

		for (const cls of (rule.class as readonly unknown[]).flat(Number.POSITIVE_INFINITY)) {
			if (typeof cls !== 'string') continue

			const match = cls.match(COMPOUND_P_RE)

			if (match) return Number(match[1])
		}
	}

	throw new Error(`No bare compound p- class found for size "${size}"`)
}

describe('control affix has-bare-button compensation', () => {
	for (const step of STEPS) {
		const buttonSize = affixStepDown(step)

		const hostPx = findSpacing(control.density[step], 'px-[')

		const bareP = findBareCompoundP(buttonSize)

		const expected = hostPx - bareP

		it(`${step}: affix.prefix has-bare override = input.px (${hostPx}) − stepped-down bare.p (${bareP}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.prefix[step],
				'has-[[data-variant=bare]:not([data-has-label])]:pl-[',
			)

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-bare override = input.px (${hostPx}) − stepped-down bare.p (${bareP}) = ${expected}`, () => {
			const actual = findSpacing(
				control.affix.suffix[step],
				'has-[[data-variant=bare]:not([data-has-label])]:pr-[',
			)

			expect(actual).toBe(expected)
		})
	}

	it('the bare compensation drifts a uniform 0.25 per step (the non-bare lockstep does not apply)', () => {
		const values = STEPS.map(
			(step) => findSpacing(control.density[step], 'px-[') - findBareCompoundP(affixStepDown(step)),
		)

		const drift = new Set<number>()

		values.reduce((prev, curr) => {
			drift.add(curr - prev)

			return curr
		})

		expect(drift.size).toBe(1)

		expect(drift.has(0.25)).toBe(true)
	})
})

// Autofill margin invariant.
//
// The browser's autofill highlight paints the inner input's full box,
// which sits flush against an affix slot (the slot's padding faces the
// frame edge, not the input). `affix.autofill` insets the highlight by
// `density.px` on the affixed side only, gated on the slot's `data-slot`
// via `group-has` against the frame group:
//
//   autofill.ml(has-prefix) = autofill.mr(has-suffix) = input.px
//
// The margins ride the `density` axis so every control input carries
// them without per-kata wiring. The test parses the live values; if
// `density.px` and the margins drift apart, or the margins fall off the
// density axis, the assertion names the step.

describe('control affix autofill margin', () => {
	for (const step of STEPS) {
		const hostPx = findSpacing(control.density[step], 'px-[')

		it(`${step}: autofill margins track input.px (${hostPx}) beside the affixed side`, () => {
			const ml = findSpacing(
				[control.affix.autofill.prefix[step]],
				'group-has-[[data-slot=prefix]]/control:autofill:ml-[',
			)

			const mr = findSpacing(
				[control.affix.autofill.suffix[step]],
				'group-has-[[data-slot=suffix]]/control:autofill:mr-[',
			)

			expect(ml).toBe(hostPx)

			expect(mr).toBe(hostPx)
		})

		it(`${step}: the density axis carries both autofill margins`, () => {
			expect(control.density[step]).toContain(control.affix.autofill.prefix[step])

			expect(control.density[step]).toContain(control.affix.autofill.suffix[step])
		})
	}
})
