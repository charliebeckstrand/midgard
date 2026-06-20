/**
 * Control bridge: the Control family archetype (text-input + check
 * branches). A pure bridge: it receives the `control` token bundle from
 * the calling kata and wires it into a recipe surface, importing only the
 * recipe engine. It declares the token shape it needs as its own contract
 * (`ControlTokens`); katakana references kiso in neither value nor type.
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
 *     `<input>`: `default` paints `surface.default`, `glass` paints
 *     `surface.glass`, `outline` is empty; kata layer their own borders.
 *   - `k.prefix` / `k.suffix` are density-keyed affix-padding tables.
 *
 * `check(t, overlay)` is the check-input branch (`checkbox`, `radio`):
 * native `<input>` overlaid on the `check.surface` chrome. `switch` reads
 * only `check.hidden` and uses `defineRecipe` directly.
 */

import type { ClassValue } from 'clsx'
import { applyRecipe, defineRecipe, type RecipeConfig } from '../../core/recipe'

type Empty = Record<never, never>

/** Density / size step keys; mirrors the kiso `sun` step scale. */
type Step = 'sm' | 'md' | 'lg'

/** The slice of the `control` token bundle the bridges read. */
type ControlTokens = {
	input: ClassValue
	density: Record<Step, ClassValue>
	size: Record<Step, ClassValue>
	resets: { number: ClassValue }
	surface: { default: ClassValue; glass: ClassValue }
	affix: { prefix: Record<Step, ClassValue>; suffix: Record<Step, ClassValue> }
	check: { base: ClassValue; hidden: ClassValue; disabled: ClassValue }
}

/** The standard control config / extras, built from the supplied tokens. */
function controlStandard(t: ControlTokens) {
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

/**
 * Wire a text-input control from its `control` tokens: a `defineRecipe`
 * callable (`variant` / `density` / `size`) carrying the kasane chrome, plus
 * `k.inputControl`, `k.number`, and the density-keyed `k.prefix` / `k.suffix`
 * affix tables. `overlay` adds kata-specific axes; `extras` adds siblings.
 */
export function control<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: ControlTokens, overlay?: Overlay, extras?: Extras) {
	return applyRecipe(controlStandard(t), overlay, extras)
}

/**
 * Wire the check-input branch (`checkbox`, `radio`): a visually-hidden native
 * `<input>` (`k.input`) over the `check.surface` chrome, plus the shared
 * `k.disabled` text class. `switch` reads `check.hidden` and uses
 * `defineRecipe` directly instead.
 */
export function check<
	Overlay extends RecipeConfig = Empty,
	Extras extends Record<string, unknown> = Empty,
>(t: ControlTokens, overlay?: Overlay, extras?: Extras) {
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
