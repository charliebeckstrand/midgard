/**
 * Check applicator — the check-input branch of the Control family
 * archetype. Covers `checkbox` and `radio`: kata that wrap a native
 * `<input type="checkbox" | "radio">` with the library's `check.surface`
 * chrome and a kata-specific indicator overlay.
 *
 * `switch` reads only `check.hidden` — its chrome is a sliding thumb on
 * a track, not a box with a check mark — and uses `defineRecipe`
 * directly.
 *
 * Returns a recipe callable as `k({ color, size, …extraAxes })`:
 *   - caller-defined slots are direct strings.
 *   - `k.input({ … })` is the visually-hidden native input recipe.
 *   - `k.disabled` is the text class for the surrounding field wrapper.
 *
 * Each kata supplies its own pieces — colour palette (a `defineColors(…)`
 * result tied to the kata's CSS-variable namespace), size axis, the
 * indicator slot's data-attribute selectors, and the
 * `--…-checked-{bg,border}` overlay — through `config.base` and the
 * standard `color` / `size` axes. The indicator sub-recipe (`checkSize`,
 * `indicatorSize`) and `skeleton` flow through the kata's `extras`.
 *
 * Kata derive their own variant type via `VariantProps<typeof k>`.
 * Checkbox and radio both add `color` and `size` axes, so the
 * empty-overlay prop union the applicator could expose wouldn't match
 * any real check-input kata.
 */

import { defineApplicator, defineRecipe } from '../../core/recipe'
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
