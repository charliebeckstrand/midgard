/**
 * Check applicator — the check-input branch of the Control family
 * archetype. Covers `checkbox` and `radio` — every kata that wraps a
 * native `<input type="checkbox" | "radio">` with the library's
 * `check.surface` chrome plus a kata-specific indicator overlay.
 *
 * `switch` reads only `check.hidden` (its chrome is a sliding thumb on a
 * track, not a box with a check mark) and routes through the catch-all
 * `recipe(...)` instead.
 *
 * Returns a recipe callable as `k({ color, size, …extraAxes })`:
 *   - any caller-defined slots are direct strings.
 *   - `k.input({ … })` is the visually-hidden native input recipe.
 *   - `k.disabled` is the text class for the surrounding field wrapper.
 *
 * The kata supplies the per-kata pieces — colour palette (a
 * `defineColors(…)` result tied to the kata's CSS-variable namespace),
 * size axis, the indicator slot's data-attribute selectors, and the
 * `--…-checked-{bg,border}` overlay — via `config.base` and the standard
 * `color` / `size` axes. The indicator sub-recipe (`checkSize`,
 * `indicatorSize`) and `skeleton` flow through the kata's `extras`.
 */

import {
	type ApplicatorReturn,
	defineApplicator,
	defineRecipe,
	type VariantPropsOf,
} from '../../core/recipe'
import { control as controlFragments } from '../genkei/control'
import { hannou, iro, sen } from '../kiso'

const { check: checkFragments } = controlFragments

const standardConfig = {
	base: [
		'relative',
		'inline-flex items-center justify-center',
		sen.focus.outline,
		...hannou.cursor,
		...checkFragments.surface,
	],
	defaults: { color: 'zinc', size: 'md' },
}

const standardExtras = {
	/** Visually-hidden native `<input>` overlaying the custom check surface. */
	input: defineRecipe({ base: checkFragments.hidden }),
	/** Disabled-state text class shared by the surrounding field wrapper. */
	disabled: iro.text.disabled,
}

export const check = defineApplicator({ config: standardConfig, extras: standardExtras })

/**
 * Prop union of the surface recipe when the kata declares no extra axes.
 * Kata that add extra axes derive their own variant type via
 * `VariantPropsOf<typeof k>`.
 *
 * Pinned via `ApplicatorReturn` rather than `ReturnType<typeof check>`
 * because the latter widens each generic to its constraint, which yields
 * a polluted prop union (every string axis resolves to `boolean | undefined`).
 */
export type CheckVariants = VariantPropsOf<
	ApplicatorReturn<typeof standardConfig, typeof standardExtras>
>
