import type { InnerStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { clamp } from '../../utilities/clamp'
import { iro, ji, kokkaku } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { heading } = kokkaku

type Level = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Type-scale ladder, low → high. A heading's size is a position on this
 * ladder: `level` sets the base rung and the density step nudges it
 * (see {@link headingScale}).
 */
const ladder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const

type Rung = (typeof ladder)[number]

/** Natural rung per level at neutral (`md`) density. */
const base = {
	1: '3xl',
	2: '2xl',
	3: 'xl',
	4: 'lg',
	5: 'md',
	6: 'sm',
} as const satisfies Record<Level, Rung>

/** Density `size` step → ladder offset. `md` is neutral; `sm`/`lg` shift one rung. */
const shift = { sm: -1, md: 0, lg: 1 } as const satisfies Record<InnerStep, number>

/**
 * Font weight per heading level: bold at the top of the scale, easing to
 * medium. Heading-like elements that don't render `<Heading>` (e.g. the panel
 * title slot) pull their weight via {@link headingWeight}.
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
 * clamped to the ladder ends. `md` returns the level's natural rung;
 * `sm`/`lg` shift every level one rung, preserving the level hierarchy.
 */
export function headingScale(level: Level, step: InnerStep): Rung {
	const index = clamp(ladder.indexOf(base[level]) + shift[step], 0, ladder.length - 1)

	// The index is clamped above; the fallback satisfies
	// `noUncheckedIndexedAccess`.
	return ladder[index] ?? base[level]
}

/**
 * Density-scaled font size for component titles (Card, Dialog / Sheet /
 * Drawer). Resolves the level-4 `lg` rung shifted ±1 by the ambient density
 * step: `md` returns `text-lg`, `sm`/`lg` move one rung. Returns the
 * matching `ji.size` class.
 */
export function titleSize(step: InnerStep): string {
	return size[headingScale(4, step)]
}

/**
 * {@link headingScale} of each level in a stepped `density-text` class. A
 * heading with no `size` takes the step of its nearest density scope, and each
 * outer step takes the class of its neighbor. Tailwind reads each class as a
 * literal, so the ramps repeat the ladder. `heading-ramp.test.ts` pins each ramp
 * to {@link headingScale}.
 */
export const headingRamp = {
	1: 'density-text-[2xl,3xl,4xl]',
	2: 'density-text-[xl,2xl,3xl]',
	3: 'density-text-[lg,xl,2xl]',
	4: 'density-text-[base,lg,xl]',
	5: 'density-text-[sm,base,lg]',
	6: 'density-text-[xs,sm,base]',
} as const satisfies Record<Level, string>

/**
 * {@link titleSize} in a stepped `density-text` class: the ramp of level 4. A
 * title takes the step of its nearest density scope.
 */
export const titleRamp = headingRamp[4]

/**
 * Heading font weight for a `level`. Used by heading-like elements that don't
 * render `<Heading>` directly, e.g. the panel title (`<h2>`, level 2).
 */
export function headingWeight(level: Level): string {
	return levelWeight[level]
}

export const k = defineRecipe({
	base: [...text.default],
	// `level` drives weight only. An explicit `size` gives the `scale` rung
	// through `headingScale`. With no `size`, the heading takes `headingRamp`.
	level: levelWeight,
	scale: size,
	defaults: { level: 1 },
	skeleton: heading,
})

/** Recipe variant props for {@link Heading} — the styling axes its kata exposes (`level`, `scale`), for consumers composing custom slots. */
export type HeadingVariants = VariantProps<typeof k>
