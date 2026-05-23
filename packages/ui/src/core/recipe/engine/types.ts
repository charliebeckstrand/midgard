/**
 * Public types for the recipe engine.
 *
 * `RecipeConfig` is the shape a kata declares — six reserved fields
 * (`base`, `palette`, `compound`, `slots`, `defaults`, `skeleton`) plus
 * any number of variant axes as top-level fields. `Recipe<C>` is what
 * `defineRecipe` returns. `VariantPropsOf<R>` extracts the prop shape
 * from either side — use it in kata to type the consumer-facing
 * `<Name>Variants` export.
 */

import type { ClassValue } from 'clsx'

import type { Color } from '../colors'

import type { PaletteConfig } from './palette'

/** A single variant axis: maps each variant value to its class set. */
export type VariantAxis = Record<string, ClassValue>

/** A compound rule applies a class set when every named axis matches. */
export type CompoundRule = Record<string, string | ClassValue> & { class: ClassValue }

/** Reserved top-level config field names — kata may not use these as axis names. */
export type ReservedField = 'base' | 'palette' | 'compound' | 'slots' | 'defaults' | 'skeleton'

/** The reserved fields' types. */
type RecipeBase = {
	base?: ClassValue
	palette?: PaletteConfig
	compound?: CompoundRule[]
	slots?: Record<string, ClassValue>
	defaults?: Record<string, string | number | boolean>
	/**
	 * Skeleton payload — a `kokkaku.<name>` config the consumer reads as
	 * `k.skeleton.base` / `k.skeleton.size[…]`. Attached to the recipe at
	 * creation time and exposed with its inferred type preserved. Sits at
	 * the config root because skeleton is a recipe property, not a sibling
	 * shape — kata that need genuinely callable siblings (sub-recipes,
	 * motion bundles, fragment maps) still pass them via the `extras`
	 * second argument.
	 */
	skeleton?: unknown
}

/**
 * A recipe config: reserved fields plus any number of variant axes at the
 * top level. The engine accepts any object that satisfies `RecipeBase`;
 * non-reserved fields are treated as variant axes at runtime.
 */
export type RecipeConfig = RecipeBase

/** The non-reserved (variant axis) fields of a config. */
type AxesOf<C> = {
	[K in keyof C as K extends ReservedField ? never : K]: C[K] extends VariantAxis ? C[K] : never
}

/** The fully-expanded config the runtime consumes. */
export type ResolvedConfig = {
	base?: ClassValue
	variants: Record<string, Record<string, ClassValue>>
	compound: CompoundRule[]
	slots: Record<string, ClassValue>
	defaults: Record<string, string | number | boolean>
}

export type Recipe<C extends RecipeBase> = {
	(props?: ComputedProps<C>): string
	/** Resolved config — exposed for introspection. */
	readonly config: ResolvedConfig
} & { [K in keyof NonNullable<C['slots']>]: string } & (C['skeleton'] extends undefined
		? unknown
		: { skeleton: C['skeleton'] })

/** Explicit `variant:` keys declared by the kata, or `never` if absent. */
type ExplicitVariantKeys<C> = C extends { variant: infer V } ? keyof V & string : never

/**
 * The prop value type for an axis. If the axis has both `true` and `false`
 * keys, it accepts a boolean (a common shorthand for binary variants).
 * Otherwise it accepts the union of literal keys (string or number).
 */
type AxisValue<A> = 'true' extends keyof A ? ('false' extends keyof A ? boolean : keyof A) : keyof A

/** Computed prop shape for a given config — used internally and by `VariantPropsOf`. */
export type ComputedProps<C> = {
	[K in keyof AxesOf<C> as K extends 'variant' ? never : K]?: AxisValue<AxesOf<C>[K]>
} & (C extends { palette: PaletteConfig<infer E, infer M> }
	? {
			variant?: (M & string) | ExplicitVariantKeys<C>
			color?: Color | (E & string)
		}
	: C extends { variant: VariantAxis }
		? { variant?: ExplicitVariantKeys<C> }
		: Record<never, never>)

/**
 * Extracts the prop shape from either a `Recipe<C>` or a `RecipeConfig`.
 *
 * @example
 *   export type ButtonVariants = VariantPropsOf<typeof button>
 */
export type VariantPropsOf<R> =
	R extends Recipe<infer C extends RecipeBase>
		? ComputedProps<C>
		: R extends RecipeBase
			? ComputedProps<R>
			: never
