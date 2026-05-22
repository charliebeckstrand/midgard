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
 * `applyRecipe` absorbs the workaround in one place: explicit return
 * type, conditional intersection that folds the empty-overlay case, and
 * a single cast at the engine boundary.
 *
 * `Empty` and `Merge` are exported so applicator authors can pin a
 * variants type to the empty-overlay shape — e.g.
 * `VariantPropsOf<ApplicatorReturn<typeof standardConfig, typeof standardExtras>>`
 * resolves to the archetype's base prop union, not the constraint-widened
 * one a bare `ReturnType<typeof applicator>` would yield.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe } from './recipe'
import type { Recipe, RecipeConfig } from './types'

/**
 * Type-level "no extra keys" marker — the empty mapped type, written as
 * `Record<never, never>` so it isn't `{}` (which biome bans because it
 * accepts any non-nullish value, including primitives).
 *
 * `keyof Empty = never`, which `Merge` relies on to fold to the base when
 * the caller declares no overlay. Biome's officially suggested
 * replacements (`object`, `unknown`, `Record<keyof any, never>`) either
 * widen or carry an index signature that poisons the engine's `AxesOf` /
 * slot mapped types — every string axis would then resolve to
 * `boolean | undefined` in consumer prop unions.
 */
export type Empty = Record<never, never>

/**
 * Conditional intersection. Folds to `Base` when `Add` has no keys, so a
 * generic with the `Empty` default doesn't leak a wide index signature
 * into the result type.
 */
export type Merge<Base, Add> = [keyof Add] extends [never] ? Base : Base & Add

/**
 * Reserved fields of a `RecipeConfig`. Every other top-level key in the
 * config literal is interpreted by the engine as a variant axis.
 */
type ReservedField = 'base' | 'palette' | 'compound' | 'slots' | 'defaults'

/**
 * The per-call recipe-config overlay a kata hands an applicator. Mirrors
 * `defineRecipe`'s config shape — extra variant axes are top-level keys
 * (just as `density` / `size` are top-level in `defineRecipe`), not nested
 * under an `axes` field. Kata-specific siblings (`skeleton`, `motion`,
 * custom sub-recipes) flow through the applicator's separate `extras`
 * argument, mirroring `defineRecipe(config, extras)` end-to-end.
 *
 * The shape is `RecipeConfig` itself; the inferred `Overlay` generic at
 * the call site captures the literal (including any caller-declared
 * axes), and `ApplicatorReturn` extracts the pieces it needs via
 * `Omit` / `extends-infer`.
 */
export type ApplicatorOverlay = RecipeConfig

/**
 * Extract the caller's slot shape from their overlay. Falls back to
 * `Empty` when the overlay declares no slots.
 */
type SlotsOf<Overlay> = Overlay extends { slots: infer S }
	? S extends Record<string, ClassValue>
		? S
		: Empty
	: Empty

/**
 * The shape `applyRecipe(...)` returns. Exposed so an applicator can
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
	StandardConfig extends RecipeConfig,
	StandardExtras extends Record<string, unknown>,
	Overlay extends ApplicatorOverlay = Empty,
	CallerExtras extends Record<string, unknown> = Empty,
> = Recipe<
	Merge<
		Omit<StandardConfig, 'slots'> & {
			slots: Merge<NonNullable<StandardConfig['slots']>, SlotsOf<Overlay>>
		},
		Omit<Overlay, ReservedField>
	>
> &
	Merge<StandardExtras, CallerExtras>

/**
 * Apply an archetype's standard config + extras over a kata's per-call
 * overlay and forward the union to `defineRecipe`. The applicator pattern,
 * crystallized.
 *
 * Signature mirrors `defineRecipe(config, extras)` end-to-end — the
 * caller's recipe-config overlay flows through `config` (second arg);
 * kata-specific siblings flow through `extras` (third arg). Standard
 * pieces live in `standard.config` / `standard.extras` at the archetype module's
 * top level.
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
 *   export function control(config = {}, extras?) {
 *     return applyRecipe(
 *       { config: standardConfig, extras: standardExtras },
 *       config,
 *       extras,
 *     )
 *   }
 */
export function applyRecipe<
	StandardConfig extends RecipeConfig,
	StandardExtras extends Record<string, unknown>,
	Overlay extends ApplicatorOverlay = Empty,
	CallerExtras extends Record<string, unknown> = Empty,
>(
	standard: { config: StandardConfig; extras: StandardExtras },
	config?: Overlay,
	extras?: CallerExtras,
): ApplicatorReturn<StandardConfig, StandardExtras, Overlay, CallerExtras> {
	const overlay = (config ?? {}) as RecipeConfig

	const {
		base: callerBase,
		slots: callerSlots,
		defaults: callerDefaults,
		palette: _ignoredPalette,
		compound: _ignoredCompound,
		...axes
	} = overlay

	const standardBase = standard.config.base
	const baseArray: ClassValue[] =
		standardBase === undefined
			? []
			: Array.isArray(standardBase)
				? [...standardBase]
				: [standardBase]

	if (callerBase !== undefined) baseArray.push(callerBase)

	const mergedConfig = {
		...standard.config,
		...axes,
		base: baseArray,
		slots: {
			...standard.config.slots,
			...callerSlots,
		},
		defaults: {
			...standard.config.defaults,
			...callerDefaults,
		},
	}

	const mergedExtras = {
		...standard.extras,
		...extras,
	}

	return defineRecipe(mergedConfig, mergedExtras) as ApplicatorReturn<
		StandardConfig,
		StandardExtras,
		Overlay,
		CallerExtras
	>
}
