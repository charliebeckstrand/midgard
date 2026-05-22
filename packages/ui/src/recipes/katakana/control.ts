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

import type { ClassValue } from 'clsx'

import { defineRecipe, type Recipe, type VariantAxis, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'

const { input, density, size, surface, affix, resets } = control

type ControlInput<
	Slots extends Record<string, ClassValue>,
	Axes extends Record<string, VariantAxis>,
> = {
	/** Extra classes appended to the control frame base. */
	base?: ClassValue
	/** Border-radius for the frame. Defaults to `rounded-lg`. */
	rounded?: ClassValue
	/**
	 * Extra variant axes beyond the auto-wired `variant` / `density` / `size`.
	 * `textarea` uses this for `resize` and `autoResize`. Reserved keys
	 * (`variant`, `density`, `size`, `base`, `slots`, `defaults`, …) collide;
	 * the engine throws on duplicate axis declarations.
	 */
	axes?: Axes
	/** Kata-defined slots. `number` is auto-wired and need not be redeclared. */
	slots?: Slots
	/** Defaults for the variant / density / size axes plus any extra axes the kata declared. */
	defaults?: Record<string, string | number | boolean>
}

/**
 * The shape `control(...)` returns. Explicit so TypeScript preserves the
 * caller's Slots / Axes / Extras keys through the engine's `defineRecipe`
 * inference — without this, generic spreads (`...cfg.slots`, `...cfg.axes`,
 * `...extras`) collapse to their constraint and consumers can't index into
 * their own slots. The intersection here mirrors what `defineRecipe(config,
 * extras)` returns at runtime: the recipe is callable on the merged variant
 * axes, the slots merge `number` with the caller's `Slots`, and the
 * `inputControl` / `prefix` / `suffix` / `autofill` extras stack with the
 * caller's `Extras`.
 */
// Type-level "no extra keys" marker. `keyof Empty = never`, which the `Merge`
// gate below relies on to fold to `Base` when the caller declares no axes /
// slots / extras. Biome's suggested replacements (`object`, `unknown`,
// `Record<keyof any, never>`) all have a non-empty keyof and would break the
// gate, so the empty object literal type is the right primitive here.
// biome-ignore lint/complexity/noBannedTypes: see comment above.
type Empty = {}

// Conditional intersection. A naive `Base & Add` with the empty-default
// would leak the constraint's wide index signature into the result type,
// which collides with the engine's `AxesOf` / slot mapped types and poisons
// consumer prop unions (every string axis resolves to `boolean`). Only fold
// the caller's generic into the result when it actually carries keys.
type Merge<Base, Add> = [keyof Add] extends [never] ? Base : Base & Add

type BaseControlConfig<Slots extends Record<string, ClassValue>> = {
	base: ClassValue
	variant: { default: ClassValue; outline: ClassValue; glass: ClassValue }
	density: typeof density
	size: typeof size
	slots: Merge<{ number: ClassValue }, Slots>
	defaults: Record<string, string | number | boolean>
}

type StandardExtras = {
	inputControl: Recipe<{
		variant: { default: ClassValue; outline: ClassValue; glass: ClassValue }
		defaults: { variant: 'default' }
	}>
	prefix: typeof affix.prefix
	suffix: typeof affix.suffix
	autofill: typeof affix.autofill
}

type ControlReturn<
	Slots extends Record<string, ClassValue>,
	Axes extends Record<string, VariantAxis>,
	Extras extends Record<string, unknown>,
> = Recipe<Merge<BaseControlConfig<Slots>, Axes>> & Merge<StandardExtras, Extras>

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
	// Defaults pin to the empty-keyof marker so the `Merge` gates fold cleanly
	// when the caller declares no axes / slots / extras.
	Slots extends Record<string, ClassValue> = Empty,
	Axes extends Record<string, VariantAxis> = Empty,
	Extras extends Record<string, unknown> = Empty,
>(cfg: ControlInput<Slots, Axes> = {}, extras?: Extras): ControlReturn<Slots, Axes, Extras> {
	const rounded = cfg.rounded ?? 'rounded-lg'

	const callerBase = cfg.base === undefined ? [] : [cfg.base]

	return defineRecipe(
		{
			base: [...input, rounded, ...callerBase],
			variant: {
				default: [],
				outline: [],
				glass: [],
			},
			density,
			size,
			...cfg.axes,
			slots: {
				number: resets.number,
				...cfg.slots,
			},
			defaults: {
				variant: 'default',
				density: 'md',
				size: 'md',
				...cfg.defaults,
			},
		},
		{
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
			...extras,
		},
	) as ControlReturn<Slots, Axes, Extras>
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
 * Pinned to the empty-generic shape because `ReturnType<typeof control_>`
 * widens each generic to its constraint, which yields a polluted prop union
 * (every string axis resolves to `boolean | undefined`).
 */
export type ControlVariants = VariantPropsOf<ControlReturn<Empty, Empty, Empty>>
