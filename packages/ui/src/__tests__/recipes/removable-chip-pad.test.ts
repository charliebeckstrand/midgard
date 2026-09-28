// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DensityStep } from '../../core/density'
import { k as badge } from '../../recipes/kata/badge'
import { findBareCompoundP, findSteps } from '../helpers/class-stops'

// Removable-chip leading-pad symmetry invariant.
//
// `removable` of `kata/badge.ts` pads the leading side of a chip to the `px` of
// the chip plus the `bare` pad of its remove button, so the label sits
// symmetric with the glyph (the rationale is there). The chip is a `radius:
// 'full'` pill, so its `px` is the `radius: 'full'` compound ramp, one stop
// above the base ramp. The button has no `size`, so it takes the step of the
// chip. This holds the sum against the live recipes at each step that a chip
// takes: TagInput, QueryChips (always `sm`), and ChatPrompt. If the badge px,
// the pill bump, or the bare compound drifts, the case fails and names the step.

// The chip is a `radius: 'full'` pill: its px is the step of the `radius:
// 'full'` compound ramp, which bumps each step one stop above the base ramp.
function findPillPx(size: DensityStep): number {
	const rules = badge.config.compound as ReadonlyArray<Record<string, unknown>>

	const pill = rules.filter((rule) => rule.radius === 'full').map((rule) => rule.class)

	return Number(findSteps(pill, 'density-px-ring-')[size])
}

const CHIP_SIZES = ['xs', 'sm', 'md', 'lg'] as const satisfies readonly DensityStep[]

describe('removable chip leading-pad symmetry', () => {
	for (const size of CHIP_SIZES) {
		const pillPx = findPillPx(size)

		const bareP = findBareCompoundP(size)

		const expected = pillPx + bareP

		it(`${size}: chip leading pad = pill px (${pillPx}) + bare remove-button p (${bareP}) = ${expected}`, () => {
			const actual = Number(
				findSteps([badge.removable], 'data-[has-suffix]:density-ps-ring-')[size],
			)

			expect(actual).toBe(expected)
		})
	}
})
