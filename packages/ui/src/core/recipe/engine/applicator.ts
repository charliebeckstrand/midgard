/**
 * Applicator helpers — the type-and-runtime machinery the katakana layer
 * needs to wrap `defineRecipe` while preserving caller-side generic typing.
 *
 * An applicator is a function that takes an archetype's standard config /
 * extras and folds in a kata's per-call overlays (extra base classes,
 * extra slots, extra variant axes, extra sub-recipes). The naïve version
 * — spread the caller's generics into a `defineRecipe(config, extras)`
 * call — loses key information at TypeScript's literal-type inference
 * step, leaving consumers unable to index into their own slots / axes.
 *
 * `composeRecipe` absorbs the workaround in one place: explicit return
 * type, conditional intersection that folds the empty-overlay case, and a
 * single cast at the engine boundary.
 *
 * `Empty` and `Merge` are exported so applicator authors can pin a
 * variants type to the empty-overlay shape — e.g.
 * `VariantPropsOf<ApplicatorReturn<typeof standardConfig, typeof standardExtras>>`
 * resolves to the archetype's base prop union, not the constraint-widened
 * one a bare `ReturnType<typeof applicator>` would yield.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe } from './recipe'
import type { Recipe, RecipeConfig, VariantAxis } from './types'

/**
 * Type-level "no extra keys" marker.
 *
 * `keyof Empty = never`, which `Merge` relies on to fold to the base when
 * the caller declares no overlay. Biome's suggested replacements
 * (`object`, `unknown`, `Record<keyof any, never>`) either widen or carry
 * an index signature that poisons the engine's `AxesOf` / slot mapped
 * types — every string axis would then resolve to `boolean | undefined`
 * in consumer prop unions.
 */
// biome-ignore lint/complexity/noBannedTypes: type-level "no extra keys" marker — see comment above.
export type Empty = {}

/**
 * Conditional intersection. Folds to `Base` when `Add` has no keys, so a
 * generic with the `Empty` default doesn't leak a wide index signature
 * into the result type.
 */
export type Merge<Base, Add> = [keyof Add] extends [never] ? Base : Base & Add

/**
 * The per-call overlay a kata hands an applicator. Mirrors `RecipeConfig`'s
 * reserved keys plus an `axes` slot for extra variant axes the kata
 * declares beyond the archetype's standard set.
 */
export type ApplicatorOverlay<
	Slots extends Record<string, ClassValue>,
	Axes extends Record<string, VariantAxis>,
	Extras extends Record<string, unknown>,
> = {
	/** Extra classes appended to the archetype's standard base. */
	base?: ClassValue
	/** Extra slots merged with the archetype's standard slots. */
	slots?: Slots
	/** Extra variant axes beyond the archetype's standard axes. */
	axes?: Axes
	/** Overrides for the archetype's standard defaults. */
	defaults?: Record<string, string | number | boolean>
	/** Extra extras merged with the archetype's standard extras. */
	extras?: Extras
}

/**
 * The shape `composeRecipe(...)` returns. Exposed so an applicator can
 * pin its `Variants` type alias to the empty-overlay case — e.g.
 *
 *   export type ControlVariants = VariantPropsOf<
 *     ApplicatorReturn<typeof standardConfig, typeof standardExtras>
 *   >
 *
 * referencing the type directly avoids the `ReturnType<typeof fn>` widen
 * that yields a constraint-resolved (and therefore polluted) prop union.
 */
export type ApplicatorReturn<
	StdConfig extends RecipeConfig,
	StdExtras extends Record<string, unknown>,
	CallerSlots extends Record<string, ClassValue> = Empty,
	CallerAxes extends Record<string, VariantAxis> = Empty,
	CallerExtras extends Record<string, unknown> = Empty,
> = Recipe<
	Merge<
		Omit<StdConfig, 'slots'> & {
			slots: Merge<NonNullable<StdConfig['slots']>, CallerSlots>
		},
		CallerAxes
	>
> &
	Merge<StdExtras, CallerExtras>

/**
 * Compose an archetype's standard config + extras with a kata's per-call
 * overlay and forward the union to `defineRecipe`. The applicator pattern,
 * crystallized.
 *
 * Without this helper, every applicator must hand-roll the type machinery
 * (`Empty`, `Merge`, explicit return-type cast) because TypeScript loses
 * generic key information through the spread inference into `defineRecipe`'s
 * `C` parameter.
 *
 * @example
 *   const standardConfig = {
 *     base: [...input, 'rounded-lg'],
 *     variant: { default: [], outline: [], glass: [] },
 *     density, size,
 *     slots: { number: resets.number },
 *     defaults: { variant: 'default', density: 'md', size: 'md' },
 *   }
 *
 *   const standardExtras = {
 *     inputControl: defineRecipe({ … }),
 *     prefix: affix.prefix, suffix: affix.suffix, autofill: affix.autofill,
 *   }
 *
 *   export function control<S, A, E>(cfg = {}, extras?) {
 *     return composeRecipe(
 *       { config: standardConfig, extras: standardExtras },
 *       { ...cfg, extras },
 *     )
 *   }
 */
export function composeRecipe<
	StdConfig extends RecipeConfig,
	StdExtras extends Record<string, unknown>,
	CallerSlots extends Record<string, ClassValue> = Empty,
	CallerAxes extends Record<string, VariantAxis> = Empty,
	CallerExtras extends Record<string, unknown> = Empty,
>(
	std: { config: StdConfig; extras: StdExtras },
	caller: ApplicatorOverlay<CallerSlots, CallerAxes, CallerExtras> = {},
): ApplicatorReturn<StdConfig, StdExtras, CallerSlots, CallerAxes, CallerExtras> {
	const stdBase = std.config.base
	const baseArray: ClassValue[] =
		stdBase === undefined ? [] : Array.isArray(stdBase) ? [...stdBase] : [stdBase]

	if (caller.base !== undefined) baseArray.push(caller.base)

	const mergedConfig = {
		...std.config,
		...caller.axes,
		base: baseArray,
		slots: {
			...std.config.slots,
			...caller.slots,
		},
		defaults: {
			...std.config.defaults,
			...caller.defaults,
		},
	}

	const mergedExtras = {
		...std.extras,
		...caller.extras,
	}

	return defineRecipe(mergedConfig, mergedExtras) as ApplicatorReturn<
		StdConfig,
		StdExtras,
		CallerSlots,
		CallerAxes,
		CallerExtras
	>
}
