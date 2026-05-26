/**
 * Applicator helpers — the types and runtime the katakana layer uses to
 * wrap `defineRecipe` without losing caller-side generic typing.
 *
 * An applicator takes an archetype's standard config / extras and folds
 * in a kata's per-call overlays — extra base classes, slots, variant
 * axes, sub-recipes. Spread the caller's generics straight into a
 * `defineRecipe(config, extras)` call and TypeScript loses the key types
 * at the literal-inference step; consumers can't then index into their
 * own slots or axes.
 *
 * `applyRecipe` absorbs the workaround in one place — explicit return
 * type, conditional intersection that folds the empty-overlay case,
 * single cast at the engine boundary. `defineApplicator` bakes an
 * archetype's standard pieces into a ready-to-call applicator; every
 * `defineRecipe`-wrapping katakana entry collapses to a one-liner.
 *
 * Applicator authors derive the empty-overlay prop union via
 * `VariantProps<ApplicatorReturn<typeof standardConfig, typeof
 * standardExtras>>`. `ReturnType<typeof applicator>` widens each generic
 * to its constraint and pollutes the prop union, so reference
 * `ApplicatorReturn` directly.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe } from './recipe'
import type { Recipe, RecipeConfig, ReservedField } from './types'

/**
 * Empty — the empty mapped type. `keyof Empty = never`, which `Merge`
 * folds against when the caller declares no overlay. Spelled
 * `Record<never, never>` rather than `{}` because biome bans the latter;
 * biome's other suggestions (`object`, `unknown`, `Record<keyof any,
 * never>`) all widen or carry an index signature that poisons the
 * engine's `AxesOf` and slot mapped types — every string axis would then
 * resolve to `boolean | undefined` in consumer prop unions.
 */
type Empty = Record<never, never>

/**
 * Conditional intersection. Folds to `Base` when `Add` has no keys, so a
 * generic with the `Empty` default doesn't leak a wide index signature
 * into the result type.
 */
type Merge<Base, Add> = [keyof Add] extends [never] ? Base : Base & Add

/**
 * The per-call overlay a kata hands an applicator. Identical to
 * `RecipeConfig` — extra variant axes are top-level keys (like `density`
 * / `size` in `defineRecipe`), not nested under an `axes` field.
 * Callable siblings (`motion`, sub-recipes) flow through the
 * applicator's separate `extras` argument, mirroring
 * `defineRecipe(config, extras)` end-to-end; `skeleton` rides the
 * overlay itself and reaches `Recipe<…>` via the targeted exclusion in
 * `ApplicatorReturn`. `ApplicatorReturn` extracts slots and axes from
 * the inferred `Overlay` via `Omit` and `extends-infer`.
 */
type ApplicatorOverlay = RecipeConfig

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
 * The shape `applyRecipe(...)` returns. Applicator authors pin their
 * archetype's empty-overlay variant type against it directly:
 *
 *   export type ControlVariants = VariantProps<
 *     ApplicatorReturn<typeof standardConfig, typeof standardExtras>
 *   >
 *
 * `ReturnType<typeof applicator>` widens each generic to its constraint
 * and pollutes the prop union; `ApplicatorReturn` resolves to the
 * empty-overlay shape instead.
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
		// Keep `skeleton` in the overlay so it flows into `Recipe<…>` and
		// surfaces as `k.skeleton` with its caller-inferred type. Other
		// reserved fields stay stripped — the runtime merges them via the
		// explicit branches in `applyRecipe`.
		Omit<Overlay, Exclude<ReservedField, 'skeleton'>>
	>
> &
	Merge<StandardExtras, CallerExtras>

/**
 * Apply an archetype's standard config / extras over a kata's per-call
 * overlay and forward to `defineRecipe`.
 *
 * Signature mirrors `defineRecipe(config, extras)` — the caller's
 * recipe-config overlay flows through `config` (second arg); kata-
 * specific siblings flow through `extras` (third arg). Standard pieces
 * live at the archetype module's top level in `standard.config` /
 * `standard.extras`.
 *
 * Merge semantics:
 *   - `base` — standard's then caller's, concatenated.
 *   - `slots` — shallow merge; caller's keys override.
 *   - `defaults` — shallow merge; caller's keys override.
 *   - `palette` — caller's overrides standard's; palettes replace, they
 *     don't merge.
 *   - `compound` — standard's then caller's, concatenated; every rule
 *     still gets a chance to match.
 *   - variant axes (every other top-level key) — shallow merge; caller's
 *     overrides on axis-name conflicts.
 *
 * Prefer `defineApplicator(standard)` for the common `(config, extras)`
 * signature; reach for `applyRecipe` directly only when an applicator
 * needs a non-standard public surface.
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
		compound: callerCompound,
		// Palette flows through `restConfig` below — caller's overrides standard's.
		...restConfig
	} = overlay

	const standardBase = standard.config.base
	const baseArray: ClassValue[] =
		standardBase === undefined
			? []
			: Array.isArray(standardBase)
				? [...standardBase]
				: [standardBase]

	if (callerBase !== undefined) baseArray.push(callerBase)

	const mergedCompound = [...(standard.config.compound ?? []), ...(callerCompound ?? [])]

	const mergedConfig = {
		...standard.config,
		...restConfig,
		base: baseArray,
		slots: {
			...standard.config.slots,
			...callerSlots,
		},
		defaults: {
			...standard.config.defaults,
			...callerDefaults,
		},
		compound: mergedCompound,
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

/**
 * Bake an archetype's standard config / extras into a ready-to-call
 * applicator. The returned function is the public surface a kata imports
 * from `katakana/<archetype>`. Thin wrapper around `applyRecipe` that
 * hides the generic-forwarding boilerplate every `defineRecipe`-wrapping
 * applicator would otherwise repeat.
 *
 * @example
 *   const standardConfig = { … }
 *   const standardExtras = { … }
 *
 *   export const control = defineApplicator({
 *     config: standardConfig,
 *     extras: standardExtras,
 *   })
 *
 *   export type ControlVariants = VariantProps<
 *     ApplicatorReturn<typeof standardConfig, typeof standardExtras>
 *   >
 */
export function defineApplicator<
	StandardConfig extends RecipeConfig,
	StandardExtras extends Record<string, unknown>,
>(standard: {
	config: StandardConfig
	extras: StandardExtras
}): <
	Overlay extends ApplicatorOverlay = Empty,
	CallerExtras extends Record<string, unknown> = Empty,
>(
	config?: Overlay,
	extras?: CallerExtras,
) => ApplicatorReturn<StandardConfig, StandardExtras, Overlay, CallerExtras> {
	return (config, extras) => applyRecipe(standard, config, extras)
}
