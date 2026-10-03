import { defineScale } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, kokkaku } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { heading } = kokkaku

/**
 * Semantic heading level, `1`-`6`, selecting the rendered `h1`-`h6` tag. A
 * component that renders a heading at a level that the consumer sets takes this
 * type for its `level` prop.
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

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
} as const satisfies Record<HeadingLevel, string>

/**
 * The text size of each level in a stepped `density-text` class. At `md` a
 * level takes its natural rung of the type scale, and each step moves it one
 * rung: `sm` one rung down and `lg` one rung up, so the levels keep their order.
 * Each outer step takes the rung of its neighbor. A heading takes the step of
 * its nearest density scope. `heading-ramp.test.ts` pins the rungs.
 */
export const headingRamp = {
	1: dan.text.h1,
	2: dan.text.h2,
	3: dan.text.h3,
	4: dan.text.title,
	5: dan.text.body,
	6: dan.text.small,
} as const satisfies Record<HeadingLevel, string>

/**
 * The text size of a component title (Card, and the Dialog, Sheet, and Drawer
 * panels): the ramp of level 4. A title takes the step of its nearest density
 * scope.
 */
export const titleRamp = headingRamp[4]

/** The size scale of {@link Heading}: the steps at which a level ramp renders a value of its own. */
export const scale = defineScale(
	headingRamp[1],
	headingRamp[2],
	headingRamp[3],
	headingRamp[4],
	headingRamp[5],
	headingRamp[6],
)

/**
 * Heading font weight for a `level`. Used by heading-like elements that don't
 * render `<Heading>` directly, e.g. the panel title.
 */
export function headingWeight(level: HeadingLevel): string {
	return levelWeight[level]
}

export const k = defineRecipe({
	base: [...text.default],
	// `level` drives weight only. The size comes from `headingRamp`.
	level: levelWeight,
	defaults: { level: 1 },
	skeleton: heading,
})

/** Recipe variant props for {@link Heading} — the styling axis its kata exposes (`level`), for consumers composing custom slots. */
export type HeadingVariants = VariantProps<typeof k>
