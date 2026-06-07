import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku, type Step } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { heading } = kokkaku

type Level = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Type-scale ladder, low → high. A heading's size is a position on this
 * ladder: `level` sets the base rung and the ambient density step nudges it
 * (see {@link headingScale}).
 */
const ladder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const

type Rung = (typeof ladder)[number]

/** Natural rung per level at neutral (`md`) density — the pre-density baseline. */
const base = {
	1: '3xl',
	2: '2xl',
	3: 'xl',
	4: 'lg',
	5: 'md',
	6: 'sm',
} as const satisfies Record<Level, Rung>

/** Density `size` step → ladder offset. `md` is neutral; `sm`/`lg` shift one rung. */
const shift = { sm: -1, md: 0, lg: 1 } as const satisfies Record<Step, number>

/**
 * Font weight per heading level — bold at the top of the scale, easing to
 * medium. Single-sourced here so heading-like elements that can't render
 * `<Heading>` (the panel title slot lives in the primitive layer) reuse it
 * via {@link headingWeight} instead of pinning their own weight token.
 */
const levelWeight = {
	1: weight.bold,
	2: weight.semibold,
	3: weight.semibold,
	4: weight.medium,
	5: weight.medium,
	6: weight.medium,
} as const satisfies Record<Level, string>

/**
 * Resolve the type-scale rung for a heading `level` under a density `step`,
 * clamped to the ladder ends. `md` returns the level's natural rung, so
 * default density reproduces the pre-density sizes exactly; `sm`/`lg` shift
 * every level one rung together, preserving the level hierarchy.
 */
export function headingScale(level: Level, step: Step): Rung {
	const index = Math.min(ladder.length - 1, Math.max(0, ladder.indexOf(base[level]) + shift[step]))

	// Clamped above, so the lookup is always in bounds; the fallback to the
	// level's natural rung only satisfies `noUncheckedIndexedAccess`.
	return ladder[index] ?? base[level]
}

/**
 * Density-scaled font size for component titles (Card, Dialog / Sheet /
 * Drawer). A title sits at the level-4 `lg` rung and shifts ±1 with the
 * ambient density step, exactly like a `<Heading>`: `md` holds the `text-lg`
 * baseline, `sm` / `lg` move one rung. Returns the matching `ji.size` class.
 */
export function titleSize(step: Step): string {
	return size[headingScale(4, step)]
}

/**
 * Heading font weight for a `level`. For callers that style a heading-like
 * element without rendering `<Heading>` — the panel title is an `<h2>` built
 * in the primitive layer, so it pulls its weight from here (level 2) rather
 * than hardcoding one.
 */
export function headingWeight(level: Level): string {
	return levelWeight[level]
}

export const k = defineRecipe({
	base: [...text.default],
	// `level` drives weight only; the type size is the `scale` rung the
	// component resolves from level + density via `headingScale`.
	level: levelWeight,
	scale: {
		xs: size.xs,
		sm: size.sm,
		md: size.md,
		lg: size.lg,
		xl: size.xl,
		'2xl': size['2xl'],
		'3xl': size['3xl'],
		'4xl': size['4xl'],
	},
	defaults: { level: 1, scale: '3xl' },
	skeleton: heading,
})

export type HeadingVariants = VariantProps<typeof k>
