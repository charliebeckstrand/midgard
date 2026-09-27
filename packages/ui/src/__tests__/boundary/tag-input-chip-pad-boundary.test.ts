import { describe, expect, it } from 'vitest'
import type { DensityStep } from '../../core/density'
import type { Ma } from '../../recipes'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { k as queryChips } from '../../recipes/kata/query-chips'
import { k as tagInput } from '../../recipes/kata/tag-input'
import { findSteps, findStop } from '../helpers/class-stops'

// Tag-chip leading-pad symmetry invariant.
//
// `kata/tag-input.ts` pads a chip's leading side to the chip's `px` + the
// remove button's `bare.p` so the label sits symmetric with the glyph
// (rationale lives there). The chip is a `radius: 'full'` pill, so its `px` is
// the `radius: 'full'` compound ramp, one stop above the base ramp. This pins
// that sum against the live recipes across the sizes a chip takes (xs/sm/md).
// If the badge px, the pill bump, or the bare compound drifts, the assertion
// fails with the computed pad and names the size.
//
// `kata/query-chips.ts` pads its chip by the same sum. Its chip and its remove
// button take fixed sizes in `query-chips.tsx`, so the case below names them.

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

// The chip is a `radius: 'full'` pill: its px is the step of the `radius:
// 'full'` compound ramp, which bumps each step one stop above the base ramp.
function findPillPx(size: DensityStep): number {
	const rules = badge.config.compound as ReadonlyArray<Record<string, unknown>>

	const pill = rules.filter((rule) => rule.radius === 'full').map((rule) => rule.class)

	return Number(findSteps(pill, 'density-px-ring-')[size])
}

const CHIP_SIZES = ['xs', 'sm', 'md'] as const satisfies readonly Ma[]

/** The fixed sizes of a `QueryChips` chip and of its remove button, in `query-chips.tsx`. */
const QUERY_CHIP = { chip: 'sm', button: 'xs' } as const satisfies Record<string, Ma>

describe('query-chips chip leading-pad symmetry', () => {
	const pillPx = findPillPx(QUERY_CHIP.chip)

	const bareP = findBareCompoundP(QUERY_CHIP.button)

	const expected = pillPx + bareP

	it(`chip leading pad = pill px (${pillPx}) + bare remove-button p (${bareP}) = ${expected}`, () => {
		const actual = findStop(
			queryChips.chip,
			`data-[has-suffix]:data-[density=${QUERY_CHIP.chip}]:ps-ring-`,
		)

		expect(actual).toBe(expected)
	})
})

describe('tag-input chip leading-pad symmetry', () => {
	for (const size of CHIP_SIZES) {
		const pillPx = findPillPx(size)

		const bareP = findBareCompoundP(size)

		const expected = pillPx + bareP

		it(`${size}: chip leading pad = pill px (${pillPx}) + bare remove-button p (${bareP}) = ${expected}`, () => {
			const actual = findStop(tagInput.badge, `data-[has-suffix]:data-[density=${size}]:ps-ring-`)

			expect(actual).toBe(expected)
		})
	}
})
