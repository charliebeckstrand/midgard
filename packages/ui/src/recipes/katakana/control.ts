/**
 * Control bridge — the Control family archetype (text-input + check
 * branches). A pure bridge: it receives the `control` token bundle from
 * the calling kata and wires it into a recipe surface, importing only the
 * recipe engine. It never imports kiso values — token shapes flow in by
 * type, the data by argument.
 *
 * `control(t, overlay)` covers `input`, `textarea`, `listbox`, `combobox`,
 * `date-picker`: kata that frame a user-input element with the library's
 * signature kasane chrome. Public variant surface is `'default' |
 * 'outline'`; `'glass'` is internal, routed via `useGlass()` when nested
 * in a glass overlay.
 *
 * Returns a recipe callable as `k({ variant, density, size, …extraAxes })`:
 *   - `k.number` and caller-defined slots are direct strings.
 *   - `k.inputControl({ variant })` is the surface recipe for the inner
 *     `<input>` — `default` paints `surface.default`, `glass` paints
 *     `surface.glass`, `outline` is empty so kata can layer borders.
 *   - `k.prefix` / `k.suffix` are density-keyed affix-padding tables.
 *
 * `check(t, overlay)` is the check-input branch (`checkbox`, `radio`):
 * native `<input>` overlaid on the `check.surface` chrome. `switch` reads
 * only `check.hidden` and uses `defineRecipe` directly.
 */

import {
	type ApplicatorReturn,
	applyRecipe,
	defineRecipe,
	type RecipeConfig,
	type VariantProps,
} from '../../core/recipe'
import type { Control } from '../kiso/control'

type Empty = Record<never, never>

/** The standard control config / extras, built from the supplied tokens. */
function controlStandard(t: Control) {
	return {
		config: {
			base: t.input,
			variant: {
				default: [],
				outline: [],
				glass: [],
			},
			density: t.density,
			size: t.size,
			slots: {
				number: t.resets.number,
			},
			defaults: { variant: 'default', density: 'md', size: 'md' },
		},
		extras: {
			inputControl: defineRecipe({
				variant: {
					default: t.surface.default,
					outline: [],
					glass: t.surface.glass,
				},
				defaults: { variant: 'default' },
			}),
			prefix: t.affix.prefix,
			suffix: t.affix.suffix,
		},
	}
}

type ControlStd = ReturnType<typeof controlStandard>

export function control<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: Control, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(controlStandard(t), overlay, extras)
}

/**
 * Prop union of the outer-frame recipe for a kata with no extra axes.
 * Kata that add axes (e.g. `textarea`'s `resize`) derive their own
 * variant type via `VariantProps<typeof k>`.
 */
export type ControlVariants = VariantProps<
	ApplicatorReturn<ControlStd['config'], ControlStd['extras']>
>

export function check<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: Control, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(
		{
			config: {
				base: t.check.base,
				defaults: { color: 'zinc', size: 'md' },
			},
			extras: {
				/** Visually-hidden native `<input>` overlaying the custom check surface. */
				input: defineRecipe({ base: t.check.hidden }),
				/** Disabled-state text class shared by the surrounding field wrapper. */
				disabled: t.check.disabled,
			},
		},
		overlay,
		extras,
	)
}
