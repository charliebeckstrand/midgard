/**
 * Control applicator — the text-input branch of the Control family
 * archetype. Covers `input`, `textarea`, `listbox`, `combobox`, and
 * `date-picker` — every kata that frames a user-input element with the
 * library's signature kasane chrome and the `default` / `outline` / `glass`
 * surface vocabulary.
 *
 * The check-input branch (`checkbox`, `radio`) lives in a sibling `check`
 * applicator; `switch` reads only `check.hidden` and uses `defineRecipe`
 * directly.
 *
 * Returns a recipe callable as `k({ variant, density, size, …extraAxes })`:
 *   - `k.number` and any caller-defined slots are direct strings.
 *   - `k.inputControl({ variant })` is the surface recipe for the inner
 *     `<input>` element — `default` paints surface.default, `glass` paints
 *     surface.glass, `outline` is empty so kata can layer borders.
 *   - `k.prefix` / `k.suffix` / `k.autofill` are density-keyed
 *     affix-padding tables read by the component.
 */

import {
	type ApplicatorReturn,
	defineApplicator,
	defineRecipe,
	type VariantPropsOf,
} from '../../core/recipe'
import { control as controlFragments } from '../genkei/control'

const { input, density, size, surface, affix, resets } = controlFragments

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

export const control = defineApplicator({ config: standardConfig, extras: standardExtras })

/**
 * Prop union of the outer-frame recipe when the kata declares no extra axes.
 * Kata that add extra axes (e.g. `textarea`'s `resize`) derive their own
 * variant type via `VariantPropsOf<typeof k>`.
 *
 * Pinned via `ApplicatorReturn` rather than `ReturnType<typeof control>`
 * because the latter widens each generic to its constraint, which yields a
 * polluted prop union (every string axis resolves to `boolean | undefined`).
 */
export type ControlVariants = VariantPropsOf<
	ApplicatorReturn<typeof standardConfig, typeof standardExtras>
>
