/**
 * Control applicator — the text-input branch of the Control family
 * archetype. Covers `input`, `textarea`, `listbox`, `combobox`, and
 * `date-picker`: kata that frame a user-input element with the library's
 * signature kasane chrome.
 *
 * Public variant surface is `'default' | 'outline'`. The recipe also
 * accepts `'glass'` for internal use only — components route to it via
 * `useGlass()` when nested inside a glass overlay (Dialog, Drawer, Sheet),
 * never as an explicit caller-chosen variant.
 *
 * The check-input branch (`checkbox`, `radio`) is the sibling `check`
 * applicator exported below — both branches of the Control family live in
 * this file. `switch` reads only `check.hidden` and uses `defineRecipe`
 * directly.
 *
 * Returns a recipe callable as `k({ variant, density, size, …extraAxes })`:
 *   - `k.number` and caller-defined slots are direct strings.
 *   - `k.inputControl({ variant })` is the surface recipe for the inner
 *     `<input>` element — `default` paints `surface.default`, `glass`
 *     paints `surface.glass`, `outline` is empty so kata can layer
 *     borders.
 *   - `k.prefix` / `k.suffix` are density-keyed affix-padding tables
 *     read by the component.
 */

import {
	type ApplicatorReturn,
	defineApplicator,
	defineRecipe,
	type VariantProps,
} from '../../../core/recipe'
import { hannou } from '../../kiso'
import { control as controlFragments } from '.'

const { fg } = hannou
const { input, density, size, surface, affix, resets, check: checkFragments } = controlFragments

const config = {
	base: input,
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

const extras = {
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
}

export const control = defineApplicator({ config, extras })

/**
 * Prop union of the outer-frame recipe for a kata with no extra axes.
 * Kata that add axes (e.g. `textarea`'s `resize`) derive their own
 * variant type via `VariantProps<typeof k>`.
 *
 * Pinned via `ApplicatorReturn` rather than `ReturnType<typeof control>`:
 * the latter widens each generic to its constraint and yields a polluted
 * prop union — every string axis resolves to `boolean | undefined`.
 */
export type ControlVariants = VariantProps<ApplicatorReturn<typeof config, typeof extras>>

/**
 * Check applicator — the check-input branch of the Control family
 * archetype. Covers `checkbox` and `radio`: kata that wrap a native
 * `<input type="checkbox" | "radio">` with the `check.surface` chrome and
 * a kata-specific indicator overlay.
 *
 * Returns a recipe callable as `k({ color, size, …extraAxes })`:
 *   - caller-defined slots are direct strings.
 *   - `k.input({ … })` is the visually-hidden native input recipe.
 *   - `k.disabled` is the text class for the surrounding field wrapper.
 *
 * Each kata supplies its own pieces — colour palette, size axis, indicator
 * selectors, and the `--…-checked-{bg,border}` overlay — through
 * `config.base` and the standard `color` / `size` axes. Kata derive their
 * own variant type via `VariantProps<typeof k>`, so the applicator exposes
 * no empty-overlay variant type.
 */
const checkConfig = {
	base: checkFragments.base,
	defaults: { color: 'zinc', size: 'md' },
}

const checkExtras = {
	/** Visually-hidden native `<input>` overlaying the custom check surface. */
	input: defineRecipe({ base: checkFragments.hidden }),
	/** Disabled-state text class shared by the surrounding field wrapper. */
	disabled: fg.disabled,
}

export const check = defineApplicator({ config: checkConfig, extras: checkExtras })
