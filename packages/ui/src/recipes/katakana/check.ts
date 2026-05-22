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
 * Mock note: this file still sources `check` fragments from
 * `genkei/control` so the rest of the package keeps type-checking. When
 * katakana lands for real, the genkei content moves into this directory
 * and the genkei folder dissolves.
 */

import {
	type ApplicatorOverlay,
	type ApplicatorReturn,
	applyRecipe,
	defineRecipe,
	type Empty,
	type VariantPropsOf,
} from '../../core/recipe'
import { control } from '../genkei/control'
import { hannou, iro, sen } from '../kiso'

const { check } = control

const standardConfig = {
	base: [
		'relative',
		'inline-flex items-center justify-center',
		sen.focus.outline,
		...hannou.cursor,
		...check.surface,
	],
	defaults: { color: 'zinc', size: 'md' },
}

const standardExtras = {
	/** Visually-hidden native `<input>` overlaying the custom check surface. */
	input: defineRecipe({ base: check.hidden }),
	/** Disabled-state text class shared by the surrounding field wrapper. */
	disabled: iro.text.disabled,
}

/**
 * Build the kata `k` surface for a check-input control.
 *
 * The returned recipe:
 *   - is callable as `k({ color, size, …extraAxes })` — outer surface classes
 *   - exposes any caller-defined slots as direct strings
 *   - exposes `k.input({ … })` — the visually-hidden native input recipe
 *   - exposes `k.disabled` — text class for the surrounding field wrapper
 *
 * The kata supplies the per-kata pieces — colour palette (a
 * `defineColors(…)` result tied to the kata's CSS-variable namespace),
 * size axis, the indicator slot's data-attribute selectors, and the
 * `--…-checked-{bg,border}` overlay — via `config.base` and the standard
 * `color` / `size` axes. The indicator sub-recipe (`checkSize`,
 * `indicatorSize`) and `skeleton` flow through the kata's `extras`.
 */
export function check_<
	Overlay extends ApplicatorOverlay = Empty,
	Extras extends Record<string, unknown> = Empty,
>(
	config?: Overlay,
	extras?: Extras,
): ApplicatorReturn<typeof standardConfig, typeof standardExtras, Overlay, Extras> {
	return applyRecipe({ config: standardConfig, extras: standardExtras }, config, extras)
}

// `check` is also the name of the const this file destructures from
// `genkei/control`. While both layers coexist during the mock, the public
// binding takes the underscore-suffixed form; the barrel renames it back
// to `check` on the way out so kata sites read `check({ … })`.
export { check_ as check }

/**
 * Prop union of the surface recipe when the kata declares no extra axes.
 * Kata that add extra axes derive their own variant type via
 * `VariantPropsOf<typeof k>`.
 *
 * Pinned via `ApplicatorReturn` rather than `ReturnType<typeof check_>`
 * because the latter widens each generic to its constraint, which yields
 * a polluted prop union (every string axis resolves to `boolean | undefined`).
 */
export type CheckVariants = VariantPropsOf<
	ApplicatorReturn<typeof standardConfig, typeof standardExtras>
>
