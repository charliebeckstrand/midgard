// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type DensityStep, stepDown } from '../../core/density'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { control } from '../../recipes/kiso/control'
import { findBareCompoundP, findSteps, findStop } from '../helpers/class-stops'

// Affix `data-slot` compensation invariant.
//
// A plain-text affix aligns its content with the input text: padding equals
// `input.px`. When the slot hosts an element with its own outer chrome (a
// non-bare Button or a Badge, matched on `data-slot`), the affix padding
// shrinks to a constant `1.5` spacing-units at every density step, pulling
// the chip's *content* 0.5 units inside the text-equidistance line. The
// constant holds across density steps: `stepDown` moves the child one
// notch down per host step, and both scales grow 0.5 per notch; the
// per-step deltas cancel, leaving only the 0.5 inset:
//
//   affix.ps(has-chip) = input.px − child.p[stepDown(step)] + 0.5 = 1.5
//
// Each slot is a relative density scope, one step below the control, and it
// is its own nearest scope. So a stepped affix class gives its value at the
// slot step: the value for a control at `step` is at `stepDown(step)`.
//
// The test parses live recipe values rather than the literal `1.5`; if
// any of (input.px, button.p, stepDown, or the 0.5 inset) drifts,
// the assertion fails with the calculated delta and points at the source.
// Badge sits one notch below Button on the shared `px` scale, so its
// override resolves to a different constant (`2`); the has-badge arm
// below pins it directly off `badge.px`.

// Each host above `xs`: its slot is one step below it. The slot of an `xs`
// host is `xs` too (no step is below `xs`), so it takes the values of the
// slot of an `sm` host.
const STEPS = ['sm', 'md', 'lg', 'xl'] as const satisfies readonly DensityStep[]

const CHIP_INSET = 0.5

/** The `px` of a control at `step`, from the stepped density axis. */
const hostPxAt = (step: DensityStep) => Number(findSteps(control.density, 'density-px-ring-')[step])

/** The value of a stepped affix class for a control at `step`, read at the slot step. */
const affixAt = (classes: readonly unknown[], prefix: string, step: DensityStep) =>
	Number(findSteps(classes, prefix)[stepDown(step)])

describe('control affix text padding', () => {
	for (const step of STEPS) {
		it(`${step}: a text affix pads at input.px (${hostPxAt(step)}), read at the slot step`, () => {
			expect(affixAt(control.affix.prefix, 'density-ps-ring-', step)).toBe(hostPxAt(step))

			expect(affixAt(control.affix.suffix, 'density-pe-ring-', step)).toBe(hostPxAt(step))
		})
	}
})

describe('control affix has-button compensation', () => {
	for (const step of STEPS) {
		const buttonSize = stepDown(step)

		const hostPx = hostPxAt(step)

		const buttonPx = Number(findSteps([button.config.base], 'density-p-ring-')[buttonSize])

		const expected = hostPx - buttonPx + CHIP_INSET

		it(`${step}: affix.prefix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findStop(
				control.affix.prefix,
				'has-[:is(button,a)[data-variant]:not([data-variant=bare])]:ps-ring-',
			)

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-button override = input.px (${hostPx}) − stepped-down button.p (${buttonPx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findStop(
				control.affix.suffix,
				'has-[:is(button,a)[data-variant]:not([data-variant=bare])]:pe-ring-',
			)

			expect(actual).toBe(expected)
		})
	}

	it('the compensation collapses to a constant across all density steps (the lockstep guarantee)', () => {
		const deltas = STEPS.map((step) => {
			const buttonSize = stepDown(step)

			const hostPx = hostPxAt(step)

			const buttonPx = Number(findSteps([button.config.base], 'density-p-ring-')[buttonSize])

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
		const badgeSize = stepDown(step)

		const hostPx = hostPxAt(step)

		const badgePx = Number(findSteps([badge.config.base], 'density-px-ring-')[badgeSize])

		const expected = hostPx - badgePx + CHIP_INSET

		it(`${step}: affix.prefix has-badge override = input.px (${hostPx}) − stepped-down badge.px (${badgePx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findStop(control.affix.prefix, 'has-[[data-slot=badge]]:ps-ring-')

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-badge override = input.px (${hostPx}) − stepped-down badge.px (${badgePx}) + chip inset (${CHIP_INSET}) = ${expected}`, () => {
			const actual = findStop(control.affix.suffix, 'has-[[data-slot=badge]]:pe-ring-')

			expect(actual).toBe(expected)
		})
	}

	it('the badge compensation collapses to a constant across all density steps (the lockstep guarantee)', () => {
		const deltas = STEPS.map((step) => {
			const badgeSize = stepDown(step)

			const hostPx = hostPxAt(step)

			const badgePx = Number(findSteps([badge.config.base], 'density-px-ring-')[badgeSize])

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
// padding (`not-data-has-label:density-p-…` in the `bare` variant of `kata/button.ts`) from
// `density.px`:
//
//   affix.ps(has-bare) = input.px − bare.p[stepDown(step)]
//
// Unlike the non-bare arm this cannot collapse to a constant: the bare compound
// scale grows 0.25 per notch (half of `density.px`'s 0.5), so the per-step
// deltas can't cancel and the value drifts (1.75 → 2 → 2.25 → 2.5). The test parses
// the live compound rule rather than the literals; if input.px, the bare
// compound p, or stepDown drifts, the assertion points at the source.

describe('control affix has-bare-button compensation', () => {
	for (const step of STEPS) {
		const buttonSize = stepDown(step)

		const hostPx = hostPxAt(step)

		const bareP = findBareCompoundP(buttonSize)

		const expected = hostPx - bareP

		it(`${step}: affix.prefix has-bare override = input.px (${hostPx}) − stepped-down bare.p (${bareP}) = ${expected}`, () => {
			const actual = affixAt(
				control.affix.prefix,
				'has-[[data-variant=bare]:not([data-has-label])]:density-ps-ring-',
				step,
			)

			expect(actual).toBe(expected)
		})

		it(`${step}: affix.suffix has-bare override = input.px (${hostPx}) − stepped-down bare.p (${bareP}) = ${expected}`, () => {
			const actual = affixAt(
				control.affix.suffix,
				'has-[[data-variant=bare]:not([data-has-label])]:density-pe-ring-',
				step,
			)

			expect(actual).toBe(expected)
		})
	}

	it('the bare compensation drifts a uniform 0.25 per step (the non-bare lockstep does not apply)', () => {
		const values = STEPS.map((step) => hostPxAt(step) - findBareCompoundP(stepDown(step)))

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
//   autofill.ms(has-prefix) = autofill.me(has-suffix) = input.px
//
// The margins ride the `density` axis so every control input carries
// them without per-kata wiring. The test parses the live values; if
// `density.px` and the margins drift apart, or the margins fall off the
// density axis, the assertion names the step.

describe('control affix autofill margin', () => {
	for (const step of STEPS) {
		const hostPx = hostPxAt(step)

		it(`${step}: autofill margins track input.px (${hostPx}) beside the affixed side`, () => {
			const ms = findSteps(
				[control.affix.autofill.prefix],
				'group-has-[[data-slot=prefix]]/control:autofill:density-ms-ring-',
			)[step]

			const me = findSteps(
				[control.affix.autofill.suffix],
				'group-has-[[data-slot=suffix]]/control:autofill:density-me-ring-',
			)[step]

			expect(Number(ms)).toBe(hostPx)

			expect(Number(me)).toBe(hostPx)
		})
	}

	it('the density axis carries both autofill margins', () => {
		expect(control.density).toContain(control.affix.autofill.prefix)

		expect(control.density).toContain(control.affix.autofill.suffix)
	})
})
