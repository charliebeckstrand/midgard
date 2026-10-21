/**
 * defineKata: the recipe of a unit. A unit is a set of slots, and each slot is a
 * recipe, in the shape that `defineRecipe` takes. The slots share one set of
 * props, so one call resolves each slot: `k({ orientation }).list`. The root
 * slot is `base`.
 *
 * A slot declares only the axes that change it. An axis with the same name in
 * two slots is one prop, and the unit holds the defaults of each prop once.
 */

import type { ClassValue } from 'clsx'

import { defineRecipe } from './recipe'
import type { CompoundRule, ComputedProps, RecipeConfig, ResolvedConfig } from './types'

/** The default of each prop of a unit. */
type Defaults = Record<string, string | number | boolean>

/** The config of a unit: its slots, with the root slot `base`, and the defaults of its props. */
type KataConfig = {
	slots: { base: RecipeConfig } & Record<string, RecipeConfig>
	defaults?: Defaults
}

/** The slots of a unit config. */
type SlotsOf<C> = C extends { slots: infer S } ? S : never

/** Merges a union of prop shapes into one shape. */
type Merge<U> = (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void
	? I
	: never

/** The props of a unit: the props of each slot, merged. An axis in two slots is one prop. */
export type KataProps<C> = Merge<
	{ [K in keyof SlotsOf<C>]: ComputedProps<SlotsOf<C>[K]> }[keyof SlotsOf<C>]
>

/** The class string of each slot of a unit. */
export type KataOutput<C> = { readonly [K in keyof SlotsOf<C>]: string }

/**
 * The resolved config of a unit, for introspection. `variants` holds each axis
 * of each slot, with the classes that each value gives to each slot, and
 * `slots` holds the resolved config of each slot.
 */
export type KataResolvedConfig<C = KataConfig> = {
	defaults: Defaults
	variants: Record<string, Record<string, Record<string, ClassValue>>>
	slots: { readonly [K in keyof SlotsOf<C>]: ResolvedConfig }
}

export type Kata<C> = {
	(props?: KataProps<C>): KataOutput<C>
	/** Resolved config, exposed for introspection. */
	readonly config: KataResolvedConfig<C>
}

/**
 * Memo entries per unit. Combinations of declared axis values stay far below
 * this. The cap only guards a caller that feeds unbounded dynamic strings into
 * a prop, and resets the memo instead of growing it.
 */
const MEMO_CAP = 1024

/** The string that a prop value gives to a memo key. A nullish value is absent. @internal */
function toKeyPart(value: unknown): string {
	return value === undefined || value === null ? '\u0001' : String(value)
}

/** The names of the props that a slot reads: its axes and the conditions of its compound rules. @internal */
function readPropNames(config: ResolvedConfig): string[] {
	const conditions = config.compound.flatMap((rule: CompoundRule) =>
		Object.keys(rule).filter((key) => key !== 'class'),
	)

	return [...Object.keys(config.variants), ...conditions]
}

/**
 * Builds the recipe of a unit from the recipe of each slot.
 *
 * @param config - The `slots` of the unit, each a recipe config, with the root
 * slot `base`, and the `defaults` of the props that the slots share.
 * @param extras - Optional kata-shaped siblings (`segment`, `skeleton`,
 * motion configs) attached as direct properties; the recipe stays callable.
 * @throws If a slot declares its own `defaults` or `slots`, because the unit
 * holds the defaults and a slot does not nest.
 * @throws If an extras key collides with a function built-in or `config`.
 */
export function defineKata<C extends KataConfig>(config: C): Kata<C>
export function defineKata<C extends KataConfig, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Kata<C> & X
export function defineKata<C extends KataConfig, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Kata<C> | (Kata<C> & X) {
	const { slots: configs, defaults = {} } = config as KataConfig

	const slots = Object.entries(configs).map(([name, slot]) => {
		if (slot.defaults !== undefined || slot.slots !== undefined) {
			throw new Error(`defineKata: slot "${name}" declares defaults or slots`)
		}

		return [name, defineRecipe({ ...slot, defaults })] as const
	})

	const names = [...new Set(slots.flatMap(([, recipe]) => readPropNames(recipe.config)))]

	const memo = new Map<string, KataOutput<C>>()

	function kata(props?: KataProps<C>): KataOutput<C> {
		const raw = props as Record<string, unknown> | undefined

		const key = names.map((name) => toKeyPart(raw?.[name] ?? defaults[name])).join('\u0000')

		const hit = memo.get(key)

		if (hit !== undefined) return hit

		const result = Object.freeze(
			Object.fromEntries(slots.map(([name, recipe]) => [name, recipe(raw)])),
		) as KataOutput<C>

		if (memo.size >= MEMO_CAP) memo.clear()

		memo.set(key, result)

		return result
	}

	if (extras) {
		for (const key of Object.keys(extras)) {
			if (key in kata || key === 'config') {
				throw new Error(`defineKata: extra name "${key}" collides with a recipe property`)
			}
		}

		Object.assign(kata, extras)
	}

	const variants: KataResolvedConfig['variants'] = {}

	for (const [name, recipe] of slots) {
		for (const [axis, values] of Object.entries(recipe.config.variants)) {
			variants[axis] ??= {}

			const merged = variants[axis]

			for (const [value, classes] of Object.entries(values)) {
				merged[value] = { ...merged[value], [name]: classes }
			}
		}
	}

	const resolved = {
		defaults,
		variants,
		slots: Object.fromEntries(slots.map(([name, recipe]) => [name, recipe.config])),
	} as KataResolvedConfig<C>

	Object.defineProperty(kata, 'config', { value: resolved, enumerable: false })

	return kata as Kata<C> & X
}
