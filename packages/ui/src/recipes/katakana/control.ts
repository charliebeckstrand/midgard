/**
 * Control applicator — the text-input branch of the Control family
 * archetype. Covers `input`, `textarea`, `listbox`, `combobox`, and
 * `date-picker` — every kata that frames a user-input element with the
 * library's signature kasane chrome and the `default` / `outline` / `glass`
 * surface vocabulary.
 *
 * The check-input branch (`checkbox`, `radio`, `switch`) reads different
 * fragments (`check.surface` / `check.hidden`) and will land as its own
 * applicator — `check` — when this mock graduates.
 *
 * Mock note: this file still sources `control` fragments from
 * `genkei/control` so the rest of the package keeps type-checking. When
 * katakana lands for real, the genkei content moves into this directory
 * (likely as `katakana/control/{frame,density,surface,affix,resets}.ts`)
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

const { input, density, size, surface, affix, resets } = control

const standardConfig = {
	base: [...input, 'rounded-lg'],
	variant: {
		default: [],
		outline: [],
		glass: [],
	},
	density,
	size,
	slots: {
		number: resets.number,
	},
	defaults: { variant: 'default', density: 'md', size: 'md' },
}

const standardExtras = {
	inputControl: defineRecipe({
		variant: {
			default: surface.default,
			outline: [],
			glass: surface.glass,
		},
		defaults: { variant: 'default' },
	}),
	prefix: affix.prefix,
	suffix: affix.suffix,
	autofill: affix.autofill,
}

/**
 * Build the kata `k` surface for a text-input control.
 *
 * The returned recipe:
 *   - is callable as `k({ variant, density, size, …extraAxes })` — outer frame classes
 *   - exposes `k.number` and any caller-defined slots as direct strings
 *   - exposes `k.inputControl({ variant })` — surface recipe for the inner
 *     `<input>` element (`default` paints surface.default, `glass` paints
 *     surface.glass, `outline` is empty so kata can layer borders)
 *   - exposes `k.prefix` / `k.suffix` / `k.autofill` — density-keyed
 *     affix-padding tables read by the component
 *
 * `extras` (second argument) mirrors `defineRecipe`'s extras slot — kata
 * use it to attach kata-specific siblings (`skeleton`, `motion`, custom
 * sub-recipes) alongside the applicator's standard wires.
 */
export function control_<
	// Defaults pin to `Empty` (the `{}` alias core exports) so the `Merge`
	// gates inside `applyRecipe` fold cleanly when the kata declares no
	// overlay. Other empty-shaped candidates (`never`, `Record<string, never>`)
	// either break the gate or leak a wide index signature into the result.
	Overlay extends ApplicatorOverlay = Empty,
	Extras extends Record<string, unknown> = Empty,
>(
	config?: Overlay,
	extras?: Extras,
): ApplicatorReturn<typeof standardConfig, typeof standardExtras, Overlay, Extras> {
	return applyRecipe({ config: standardConfig, extras: standardExtras }, config, extras)
}

// `control` is also the name of the const in `genkei/control`. While both
// layers coexist during the mock, this file's public binding takes the
// underscore-suffixed form; the barrel renames it back to `control` on the
// way out so kata sites read `control({ … })`.
export { control_ as control }

/**
 * Prop union of the outer-frame recipe when the kata declares no extra axes.
 * Kata that add extra axes (e.g. `textarea`'s `resize`) derive their own
 * variant type via `VariantPropsOf<typeof k>`.
 *
 * Pinned via `ApplicatorReturn` rather than `ReturnType<typeof control_>`
 * because the latter widens each generic to its constraint, which yields a
 * polluted prop union (every string axis resolves to `boolean | undefined`).
 */
export type ControlVariants = VariantPropsOf<
	ApplicatorReturn<typeof standardConfig, typeof standardExtras>
>
