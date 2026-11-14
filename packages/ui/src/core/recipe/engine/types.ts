/**
 * Public types for the recipe engine.
 *
 * `RecipeConfig` is the shape of a recipe: the reserved fields (`base`,
 * `palette`, `compound`, `defaults`) plus any number of variant axes as
 * top-level fields. `Recipe<C>` is what `defineRecipe` returns: the recipe of
 * one slot of a unit (`engine/kata.ts`). `VariantProps<R>` extracts the prop
 * shape from either side; use it in kata to type the consumer-facing
 * `<Name>Variants` export.
 */

import type { ClassValue } from 'clsx'

import type { PaletteConfig } from './palette'

/** A single variant axis: maps each variant value to its class set. */
export type VariantAxis = Record<string, ClassValue>

/**
 * A compound rule applies a class set when every named axis matches. The
 * engine coerces a condition value to its axis key, the same conversion a
 * caller's prop takes. A rule on a `true` / `false` axis therefore accepts
 * `{ interactive: true }` and `{ interactive: 'true' }` alike.
 */
export type CompoundRule = Record<string, string | ClassValue> & { class: ClassValue }

/** Reserved top-level config field names; kata must not use these as axis names. */
export type ReservedField = 'base' | 'palette' | 'compound' | 'defaults'

/**
 * A recipe config: the reserved fields plus any number of variant axes at the
 * top level. The runtime treats each field that is not reserved as a variant
 * axis.
 */
export type RecipeConfig = {
	base?: ClassValue
	palette?: PaletteConfig<string, string>
	compound?: CompoundRule[]
	defaults?: Record<string, string | number | boolean>
}

/**
 * The expanded config, exposed as `recipe.config` for introspection: axes
 * spliced with the palette, and compound rules flattened with their
 * conditions normalized to axis keys. The call path reads a compiled plan
 * derived from this, not the object itself.
 */
export type ResolvedConfig = {
	base?: ClassValue
	variants: Record<string, Record<string, ClassValue>>
	compound: CompoundRule[]
	defaults: Record<string, string | number | boolean>
}

export type Recipe<C extends RecipeConfig> = {
	(props?: ComputedProps<C>): string
	/** Resolved config, exposed for introspection. */
	readonly config: ResolvedConfig
}

/** Explicit `variant:` keys declared by the kata, or `never` if absent. */
type ExplicitVariantKeys<C> = C extends { variant: infer V } ? keyof V & string : never

/**
 * The prop value type for an axis. If the axis has both `true` and `false`
 * keys, it accepts a boolean (a common shorthand for binary variants), and
 * each other key of the axis. Otherwise it accepts the union of literal keys
 * (string or number).
 */
type AxisValue<A> = 'true' extends keyof A
	? 'false' extends keyof A
		? boolean | Exclude<keyof A, 'true' | 'false'>
		: keyof A
	: keyof A

/** The `variant` axis and the color set of the palette of a config, or `never` without a palette. */
type PaletteAxes<C> = C extends { palette: PaletteConfig<infer M, infer Col> }
	? { variant: M & string; color: Col }
	: never

/** The prop value of an axis: its keys, joined with the palette variants for the `variant` axis. */
type PropValue<C, K extends keyof C> = K extends 'variant'
	? ExplicitVariantKeys<C> | PaletteAxes<C>['variant']
	: C[K] extends VariantAxis
		? AxisValue<C[K]>
		: never

/** The props that a palette adds: `color`, and `variant` when the config has no explicit `variant` axis. */
type PaletteProps<C> = [PaletteAxes<C>] extends [never]
	? unknown
	: { color?: PaletteAxes<C>['color'] } & ('variant' extends keyof C
			? unknown
			: { variant?: PaletteAxes<C>['variant'] })

/**
 * Computed prop shape for a given config; used internally and by `VariantProps`.
 *
 * @remarks Each axis maps to its prop through a mapped type that only filters
 * the keys, so the prop keeps the TSDoc of its axis. That includes a `variant`
 * axis that a palette adds to. TypeScript keeps the TSDoc only when the mapped
 * type keeps the key, so the `color` prop of a palette has no TSDoc of its own.
 *
 * A config without a `variant` axis or a palette adds `unknown` to the axis
 * props, not `Record<never, never>`. An intersection with an empty object type
 * stops the weak-type check of TypeScript, so a call such as `k(true)` would
 * compile. The engine then reads no prop and gives the defaults.
 */
export type ComputedProps<C> = {
	[K in keyof C as K extends ReservedField ? never : K]?: PropValue<C, K>
} & PaletteProps<C>

/**
 * Extracts the prop shape from either a `Recipe<C>` or a `RecipeConfig`.
 *
 * @remarks A recipe gives the type of its call parameter. The type does not
 * infer `C` back from `Recipe<C>`, because that inference fails on a recipe
 * whose extras hold other recipes.
 *
 * @example
 *   export type ButtonVariants = VariantProps<typeof button>
 */
export type VariantProps<R> = R extends (props?: infer P) => unknown
	? NonNullable<P>
	: R extends RecipeConfig
		? ComputedProps<R>
		: never
