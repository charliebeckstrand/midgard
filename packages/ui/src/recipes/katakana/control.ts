/**
 * Control bridge: the Control family archetype (text-input + check
 * branches). A pure bridge: it receives the `control` token bundle from
 * the calling kata and wires it into a recipe surface, importing only the
 * recipe engine. It declares the token shape it needs as its own contract
 * (`ControlTokens`); katakana references kiso in neither value nor type.
 *
 * `control(t, overlay)` covers `input` and `textarea`: kata that frame a
 * user-input element with the library's signature kasane chrome. Public
 * variant surface is `'default' | 'outline'`; `'glass'` is internal, routed
 * via `useGlass()` when nested in a glass overlay. Listbox, combobox, and
 * date-picker read a subset of the `control` tokens with no bridge.
 *
 * Returns a recipe callable as `k({ variant, …extraAxes })`. The density
 * classes are stepped `density-*` utilities in the base, so the recipe has no
 * step axis. The control takes the step of its nearest density scope.
 * It returns:
 *   - `k.number` and the slots of the caller are merged class strings, or
 *     groups of them.
 *   - `k.surface({ variant })` is the surface recipe of the ControlFrame:
 *     `default` paints `surface.default`, `glass` paints `surface.glass`,
 *     `outline` is empty; kata layer their own borders.
 *
 * `check(t, overlay)` is the check-input branch (`checkbox`, `radio`):
 * native `<input>` overlaid on the `check.surface` chrome. `switch` reads
 * only `check.hidden` and uses `defineRecipe` directly.
 */

import type { ClassValue } from 'clsx'
import { applyRecipe, defineRecipe, type RecipeConfig } from '../../core/recipe'

type Empty = Record<never, never>

/** The slice of the `control` token bundle the bridges read. */
type ControlTokens = {
	input: ClassValue
	density: ClassValue
	reset: { number: ClassValue }
	surface: { default: ClassValue; glass: ClassValue }
	check: { base: ClassValue; hidden: ClassValue; disabled: ClassValue }
}

/** The standard control config / extras, built from the supplied tokens. */
function controlStandard(t: ControlTokens) {
	return {
		config: {
			base: [t.input, t.density],
			variant: {
				default: [],
				outline: [],
				glass: [],
			},
			slots: {
				number: t.reset.number,
			},
			defaults: { variant: 'default' },
		},
		extras: {
			surface: defineRecipe({
				variant: {
					default: t.surface.default,
					outline: [],
					glass: t.surface.glass,
				},
				defaults: { variant: 'default' },
			}),
		},
	}
}

/**
 * Wire a text-input control from its `control` tokens. It returns a
 * `defineRecipe` callable (`variant`) carrying the kasane chrome, plus
 * `k.surface` and `k.number`. `overlay` adds kata-specific axes and slots;
 * `extras` adds siblings.
 */
export function control<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: ControlTokens, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(controlStandard(t), overlay, extras)
}

/**
 * Wire the check-input branch (`checkbox`, `radio`). It returns a
 * visually-hidden native `<input>` (`k.input`) over the `check.surface` chrome.
 * `switch` reads `check.hidden` and uses `defineRecipe` directly instead.
 */
export function check<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: ControlTokens, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(
		{
			config: {
				base: t.check.base,
				defaults: { color: 'zinc' },
			},
			extras: {
				/** Visually-hidden native `<input>` overlaying the custom check surface. */
				input: defineRecipe({ base: t.check.hidden }),
			},
		},
		overlay,
		extras,
	)
}
