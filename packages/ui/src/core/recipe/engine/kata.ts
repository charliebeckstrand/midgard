/**
 * defineKata: the recipe of a unit. A unit is a set of slots, and each slot is a
 * recipe, in the shape that `defineRecipe` takes. The slots share one set of
 * props, so one call resolves each slot: `k({ orientation }).list`. The root
 * slot is `base`.
 *
 * A slot declares only the axes that change it. An axis with the same name in
 * two slots is one prop, and the unit holds the defaults of each prop once.
 *
 * defineGroup: the shared structure of a family of units, in the same shape. A
 * group is data, not a callable. A unit that `extends` a group gets each slot,
 * axis, default, and extra of the group, and adds its own. One rule merges the
 * two for each family (see {@link mergeSlot}).
 */

import type { ClassValue } from 'clsx'

import { defineRecipe, RESERVED } from './recipe'
import type { CompoundRule, ComputedProps, RecipeConfig, ResolvedConfig } from './types'

/** The default of each prop of a unit. */
type Defaults = Record<string, string | number | boolean>

/**
 * The slots of a group or a unit, by name. Each field of a slot that is not
 * reserved is an axis, so a slot takes any field name.
 */
type Slots = Record<string, RecipeConfig & Record<string, unknown>>

/** The config of a group: its slots, the defaults of its props, and the group that it extends. */
type GroupInput = { extends?: Group; slots?: Slots; defaults?: Defaults }

/** The shared structure of a family of units, which a unit `extends`. */
export type Group<S = Slots, X = unknown> = {
	readonly slots: S
	readonly defaults: Defaults
	readonly extras: X
}

/**
 * The config of a unit. A unit that extends no group declares its root slot
 * `base`. A unit that extends a group can take `base` from the group.
 */
type KataConfig =
	| { extends?: undefined; slots: { base: RecipeConfig } & Slots; defaults?: Defaults }
	| { extends: Group; slots?: Slots; defaults?: Defaults }

/** The slots of a group and of a unit, merged: a slot in both takes the axes of both. */
type MergeSlots<A, B> = {
	[K in keyof A | keyof B]: (K extends keyof A ? A[K] : unknown) &
		(K extends keyof B ? B[K] : unknown)
}

/** The slots that a unit config declares, or none. */
type OwnSlotsOf<C> = C extends { slots: infer S } ? S : Record<never, never>

/** The slots of a unit: its own, merged over the slots of the group that it extends. */
type SlotsOf<C> = C extends { extends: Group<infer G> }
	? MergeSlots<G, OwnSlotsOf<C>>
	: OwnSlotsOf<C>

/** The extras of the group that a unit extends, or none. */
type GroupExtrasOf<C> = C extends { extends: Group<unknown, infer X> } ? X : unknown

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

/**
 * Merges the slot of a group and the slot of a unit. The classes of the group
 * come first, and the classes of the unit after them, so `tailwind-merge` lets
 * the unit win a conflict. This applies to `base` and to each value of each
 * axis. A new axis or a new value is added. The compound rules of the group
 * come first. A unit cannot remove a class of the group, so the shared
 * structure stays shared.
 *
 * @throws If the group and the unit both declare a palette.
 * @internal
 */
function mergeSlot(name: string, group?: RecipeConfig, unit?: RecipeConfig): RecipeConfig {
	if (group === undefined) return unit ?? {}

	if (unit === undefined) return group

	if (group.palette !== undefined && unit.palette !== undefined) {
		throw new Error(`defineKata: slot "${name}" has a palette in the group and in the unit`)
	}

	const merged: Record<string, unknown> = { ...group, ...unit, base: [group.base, unit.base] }

	if (group.compound !== undefined && unit.compound !== undefined) {
		merged.compound = [...group.compound, ...unit.compound]
	}

	const groupAxes = group as Record<string, Record<string, ClassValue>>

	for (const [key, values] of Object.entries(unit as Record<string, Record<string, ClassValue>>)) {
		const shared = groupAxes[key]

		if (Object.hasOwn(RESERVED, key) || shared === undefined) continue

		const axis: Record<string, ClassValue> = { ...shared }

		for (const [value, classes] of Object.entries(values)) axis[value] = [shared[value], classes]

		merged[key] = axis
	}

	return merged as RecipeConfig
}

/** The names of the props that a slot reads: its axes and the conditions of its compound rules. @internal */
function readPropNames(config: ResolvedConfig): string[] {
	const conditions = config.compound.flatMap((rule: CompoundRule) =>
		Object.keys(rule).filter((key) => key !== 'class'),
	)

	return [...Object.keys(config.variants), ...conditions]
}

/** Throws if a slot declares its own `defaults` or `slots`. @internal */
function assertSlots(caller: string, slots: Slots): void {
	for (const [name, slot] of Object.entries(slots)) {
		if (slot.defaults !== undefined || slot.slots !== undefined) {
			throw new Error(`${caller}: slot "${name}" declares defaults or slots`)
		}
	}
}

/**
 * Merges a unit or a group over the group that it extends: each slot, the
 * defaults, and the extras. A config that extends no group keeps its own.
 *
 * @throws If a slot declares its own `defaults` or `slots`.
 * @internal
 */
function mergeOver(caller: string, config: GroupInput, extras?: Record<string, unknown>) {
	const { extends: group, slots: own = {} } = config

	assertSlots(caller, own)

	const slots: Slots = {}

	for (const name of new Set([...Object.keys(group?.slots ?? {}), ...Object.keys(own)])) {
		slots[name] = mergeSlot(name, group?.slots[name], own[name])
	}

	return {
		slots,
		defaults: { ...group?.defaults, ...config.defaults },
		extras: group === undefined ? extras : { ...(group.extras as object), ...extras },
	}
}

/**
 * Declares the shared structure of a family of units. A group holds slots,
 * axes, and defaults in the shape of a unit, and the extras that each unit of
 * the family carries. It builds no recipe: a unit builds it when it extends
 * the group. A group can extend a group, with the merge of a unit.
 *
 * @param config - The `slots` of the group, each a recipe config, the
 * `defaults` of their props, and the group that it `extends`.
 * @param extras - Kata-shaped siblings that each unit of the family carries.
 * @throws If a slot declares its own `defaults` or `slots`.
 */
export function defineGroup<C extends GroupInput>(config: C): Group<SlotsOf<C>, GroupExtrasOf<C>>
export function defineGroup<C extends GroupInput, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Group<SlotsOf<C>, GroupExtrasOf<C> & X>
export function defineGroup(config: GroupInput, extras?: Record<string, unknown>): Group {
	const { slots, defaults, extras: merged = {} } = mergeOver('defineGroup', config, extras)

	return Object.freeze({ slots, defaults, extras: merged })
}

/**
 * Builds the recipe of a unit from the recipe of each slot.
 *
 * @param config - The `slots` of the unit, each a recipe config, with the root
 * slot `base`, and the `defaults` of the props that the slots share. With
 * `extends`, the unit merges its slots over the slots of the group, its
 * defaults over the defaults of the group, and its extras over the extras of
 * the group (see {@link mergeSlot}).
 * @param extras - Optional kata-shaped siblings (`segment`, `skeleton`,
 * motion configs) attached as direct properties; the recipe stays callable.
 * @throws If a slot declares its own `defaults` or `slots`, because the unit
 * holds the defaults and a slot does not nest.
 * @throws If the unit has no root slot `base`, from itself or from its group.
 * @throws If an extras key collides with a function built-in or `config`.
 */
export function defineKata<C extends KataConfig>(config: C): Kata<C> & GroupExtrasOf<C>
export function defineKata<C extends KataConfig, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Kata<C> & GroupExtrasOf<C> & X
export function defineKata<C extends KataConfig, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Kata<C> | (Kata<C> & X) {
	const {
		slots: configs,
		defaults,
		extras: attached,
	} = mergeOver('defineKata', config as KataConfig, extras)

	if (configs.base === undefined) throw new Error('defineKata: the unit has no root slot "base"')

	const slots = Object.entries(configs).map(
		([name, slot]) => [name, defineRecipe({ ...slot, defaults })] as const,
	)

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

	if (attached !== undefined) {
		for (const key of Object.keys(attached)) {
			if (key in kata || key === 'config') {
				throw new Error(`defineKata: extra name "${key}" collides with a recipe property`)
			}
		}

		Object.assign(kata, attached)
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
