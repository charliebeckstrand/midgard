/**
 * Public types for the recipe engine.
 *
 * `RecipeConfig` is the shape a kata declares: six reserved fields
 * (`base`, `palette`, `compound`, `slots`, `defaults`, `skeleton`) plus
 * any number of variant axes as top-level fields. `Recipe<C>` is what
 * `defineRecipe` returns. `VariantProps<R>` extracts the prop shape
 * from either side; use it in kata to type the consumer-facing
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

/**
 * The classes of one slot, or a group of named slots. The engine merges a class
 * list into one string. A plain object is a group, and the engine merges each of
 * its entries the same way, so a part keeps its children under its own name
 * (`close: { base, line }` gives `k.close.base` and `k.close.line`). The group
 * takes the place of the object form of clsx, which no recipe uses.
 */
export type SlotValue =
	| string
	| number
	| bigint
	| boolean
	| null
	| undefined
	| readonly ClassValue[]
	| { readonly [name: string]: SlotValue }

/**
 * The merged form of a slot: a class string, or a group of them. A type with a
 * string index signature, such as the wide `ClassValue`, is a class list.
 */
type SlotClasses<S> = [S] extends [object]
	? [S] extends [readonly unknown[]]
		? string
		: string extends keyof S
			? string
			: { readonly [K in keyof S]: SlotClasses<S[K]> }
	: string

/** Reserved top-level config field names; kata must not use these as axis names. */
export type ReservedField = 'base' | 'palette' | 'compound' | 'slots' | 'defaults' | 'skeleton'

/** The reserved fields' types. */
type RecipeBase = {
	base?: ClassValue
	palette?: PaletteConfig
	compound?: CompoundRule[]
	slots?: Record<string, SlotValue>
	defaults?: Record<string, string | number | boolean>
	/**
	 * Skeleton payload: a `kokkaku.<name>` config the consumer reads as
	 * `k.skeleton.base` / `k.skeleton.size[…]`. Attaches to the recipe at
	 * creation time with its inferred type preserved. Callable
	 * siblings (sub-recipes, motion bundles, fragment maps) pass through
	 * the `extras` second argument instead.
	 */
	skeleton?: unknown
}

/**
 * A recipe config: reserved fields plus any number of variant axes at the
 * top level. The engine accepts any object that satisfies `RecipeBase`;
 * the runtime treats non-reserved fields as variant axes.
 */
export type RecipeConfig = RecipeBase

/** The non-reserved (variant axis) fields of a config. */
type AxesOf<C> = {
	[K in keyof C as K extends ReservedField ? never : K]: C[K] extends VariantAxis ? C[K] : never
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
	slots: Record<string, SlotValue>
	defaults: Record<string, string | number | boolean>
}

export type Recipe<C extends RecipeBase> = {
	(props?: ComputedProps<C>): string
	/** Resolved config, exposed for introspection. */
	readonly config: ResolvedConfig
} & {
	[K in keyof NonNullable<C['slots']>]: SlotClasses<NonNullable<C['slots']>[K]>
} & SkeletonOf<C>

/**
 * The `skeleton` property of a recipe. A config without a `skeleton` field
 * gives no property, because the engine attaches none. The type finds the key
 * before it reads the field: a read of `C['skeleton']` on a config without the
 * field gives `unknown`, and that type would put `k.skeleton` on each recipe.
 */
type SkeletonOf<C> = 'skeleton' extends keyof C
	? C[keyof C & 'skeleton'] extends undefined
		? unknown
		: { skeleton: C[keyof C & 'skeleton'] }
	: unknown

/** Explicit `variant:` keys declared by the kata, or `never` if absent. */
type ExplicitVariantKeys<C> = C extends { variant: infer V } ? keyof V & string : never

/**
 * The prop value type for an axis. If the axis has both `true` and `false`
 * keys, it accepts a boolean (a common shorthand for binary variants).
 * Otherwise it accepts the union of literal keys (string or number).
 */
type AxisValue<A> = 'true' extends keyof A ? ('false' extends keyof A ? boolean : keyof A) : keyof A

/**
 * Computed prop shape for a given config; used internally and by `VariantProps`.
 *
 * @remarks A config without a `variant` axis or a palette adds `unknown` to the
 * axis props, not `Record<never, never>`. An intersection with an empty object
 * type stops the weak-type check of TypeScript, so a call such as `k(true)`
 * would compile. The engine then reads no prop and gives the defaults.
 */
export type ComputedProps<C> = {
	[K in keyof AxesOf<C> as K extends 'variant' ? never : K]?: AxisValue<AxesOf<C>[K]>
} & (C extends { palette: PaletteConfig<infer E, infer M, infer Col> }
	? {
			variant?: (M & string) | ExplicitVariantKeys<C>
			color?: Col | (E & string)
		}
	: C extends { variant: VariantAxis }
		? { variant?: ExplicitVariantKeys<C> }
		: unknown)

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
export type VariantProps<R> = R extends (props?: infer P) => string
	? NonNullable<P>
	: R extends RecipeBase
		? ComputedProps<R>
		: never
