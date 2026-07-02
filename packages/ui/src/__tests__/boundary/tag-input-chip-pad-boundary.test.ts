import { describe, expect, it } from 'vitest'

import type { Ma } from '../../recipes'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { k as tagInput } from '../../recipes/kata/tag-input'

// Tag-chip leading-pad symmetry invariant.
//
// `kata/tag-input.ts` pads a chip's leading side to the chip's `px` + the
// remove button's `bare.p` so the label sits symmetric with the glyph
// (rationale lives there). The chip is a rounded-full pill, so its `px` is the
// base badge scale plus any `rounded-full` size compound (small pills get a
// bump). This pins that sum against the live recipes across the sizes a chip
// takes (xs/sm/md); if the badge px, the pill bump, or the bare compound
// drifts, the assertion fails with the computed pad and names the size.

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

// The chip is a rounded-full pill: its px is the base size-row px unless a
// `rounded-full` size compound overrides it (small pills get a bump).
function findPillPx(size: Ma): number {
	const rules = badge.config.compound as ReadonlyArray<Record<string, unknown>>

	for (const rule of rules) {
		if (rule.rounded !== 'full' || rule.size !== size) continue

		for (const cls of [rule.class].flat(Number.POSITIVE_INFINITY)) {
			if (typeof cls !== 'string' || !cls.startsWith('px-')) continue

			const match = cls.match(SPACING_RE)

			if (match) return Number(match[1])
		}
	}

	return findSpacing(badge.config.variants.size?.[size] as readonly unknown[], 'px-[')
}

const CHIP_SIZES = ['xs', 'sm', 'md'] as const satisfies readonly Ma[]

describe('tag-input chip leading-pad symmetry', () => {
	for (const size of CHIP_SIZES) {
		const pillPx = findPillPx(size)

		const bareP = findBareCompoundP(size)

		const expected = pillPx + bareP

		it(`${size}: chip leading pad = pill px (${pillPx}) + bare remove-button p (${bareP}) = ${expected}`, () => {
			const actual = findSpacing(tagInput.badge, `data-[has-suffix]:data-[size=${size}]:pl-[`)

			expect(actual).toBe(expected)
		})
	}
})
