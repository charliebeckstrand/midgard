/**
 * defineKata: the recipe of a unit. A unit is a set of slots, and each slot is a
 * recipe, in the shape that `defineRecipe` takes. The slots share one set of
 * props, so one call resolves each slot: `k({ orientation }).list`. The config
 * is the recipe of the root slot `base`, and `slots` holds the child slots. A
 * child slot with no axes can be only its classes.
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

/** A slot as the engine holds it: a recipe config. Each field that is not reserved is an axis. */
type Slot = RecipeConfig & Record<string, unknown>

/** The slots of a group or a unit, by name. The root slot is `base`. */
type Slots = Record<string, Slot>

/** A child slot as a config writes it: a recipe config, or only its classes. */
type SlotInput =
	| string
	| readonly ClassValue[]
	| (Omit<Slot, 'slots' | 'defaults'> & Record<string, unknown>)

/** The fields of a unit config that are not its root recipe. */
type UnitField = 'extends' | 'slots' | 'defaults'

/**
 * The config of a group or a unit. The config is the recipe of its root slot
 * `base`: `base`, `palette`, `compound`, and the axes. `slots` holds the child
 * slots, `defaults` holds the default of each prop of each slot, and `extends`
 * names the group that it extends.
 */
type UnitInput = Omit<RecipeConfig, 'slots' | 'defaults'> &
	Record<string, unknown> & {
		extends?: Group
		slots?: Record<string, SlotInput>
		defaults?: Defaults
	}

/** The shared structure of a family of units, which a unit `extends`. */
export type Group<S = Slots, X = unknown> = {
	readonly slots: S
	readonly defaults: Defaults
	readonly extras: X
}

/** The slots of a group and of a unit, merged: a slot in both takes the axes of both. */
type MergeSlots<A, B> = {
	[K in keyof A | keyof B]: (K extends keyof A ? A[K] : unknown) &
		(K extends keyof B ? B[K] : unknown)
}

/** A child slot as a recipe config: a slot written as its classes is its `base`. */
type ToSlot<S> = S extends string | readonly unknown[] ? { base: S } : S

/** The root slot of a config: each field that is not a unit field. */
type RootOf<C> = Omit<C, UnitField>

/** The slots that a config declares: its root, and each child slot. */
type OwnSlotsOf<C> = { base: RootOf<C> } & (C extends { slots: infer S }
	? { [K in keyof S]: ToSlot<S[K]> }
	: Record<never, never>)

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
export type KataResolvedConfig<C = UnitInput> = {
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
function mergeSlot(name: string, group?: Slot, unit?: Slot): Slot {
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

	return merged as Slot
}

/** The names of the props that a slot reads: its axes and the conditions of its compound rules. @internal */
function readPropNames(config: ResolvedConfig): string[] {
	const conditions = config.compound.flatMap((rule: CompoundRule) =>
		Object.keys(rule).filter((key) => key !== 'class'),
	)

	return [...Object.keys(config.variants), ...conditions]
}

/** The fields of a config that are not the recipe of its root slot. @internal */
const UNIT_FIELDS: ReadonlySet<string> = new Set(['extends', 'slots', 'defaults'])

/**
 * Reads the slots of a config: the root slot `base` from the fields of the
 * config, and each child slot from `slots`. A child slot written as its
 * classes becomes a slot with that `base`.
 *
 * @throws If a child slot is named `base`, or declares its own `defaults` or `slots`.
 * @internal
 */
function readSlots(caller: string, config: UnitInput): Slots {
	const root = Object.entries(config).filter(([key]) => !UNIT_FIELDS.has(key))

	const slots: Slots = root.length > 0 ? { base: Object.fromEntries(root) } : {}

	for (const [name, value] of Object.entries(config.slots ?? {})) {
		if (name === 'base') throw new Error(`${caller}: the root slot "base" is the config itself`)

		const slot = (
			typeof value === 'string' || Array.isArray(value) ? { base: value } : value
		) as Slot

		if (slot.defaults !== undefined || slot.slots !== undefined) {
			throw new Error(`${caller}: slot "${name}" declares defaults or slots`)
		}

		slots[name] = slot
	}

	return slots
}

/**
 * Merges a unit or a group over the group that it extends: each slot, the
 * defaults, and the extras. A config that extends no group keeps its own.
 *
 * @throws If a child slot is named `base`, or declares its own `defaults` or `slots`.
 * @internal
 */
function inherit(caller: string, config: UnitInput, extras?: Record<string, unknown>) {
	const { extends: group } = config

	const own = readSlots(caller, config)

	const slots: Slots = {}

	for (const name of new Set(['base', ...Object.keys(group?.slots ?? {}), ...Object.keys(own)])) {
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
 * @param config - The recipe of the root slot, the child `slots`, the
 * `defaults` of their props, and the group that it `extends`.
 * @param extras - Kata-shaped siblings that each unit of the family carries.
 * @throws If a child slot is named `base`, or declares its own `defaults` or `slots`.
 */
export function defineGroup<C extends UnitInput>(config: C): Group<SlotsOf<C>, GroupExtrasOf<C>>
export function defineGroup<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Group<SlotsOf<C>, GroupExtrasOf<C> & X>
export function defineGroup(config: UnitInput, extras?: Record<string, unknown>): Group {
	const { slots, defaults, extras: merged = {} } = inherit('defineGroup', config, extras)

	return Object.freeze({ slots, defaults, extras: merged })
}

/**
 * Builds the recipe of a unit from the recipe of each slot.
 *
 * @param config - The recipe of the root slot `base` (`base`, `palette`,
 * `compound`, and the axes), the child `slots`, and the `defaults` of the
 * props that the slots share. A child slot is a recipe config, or only its
 * classes. With `extends`, the unit merges its slots over the slots of the
 * group, its defaults over the defaults of the group, and its extras over the
 * extras of the group (see {@link mergeSlot}).
 * @param extras - Optional kata-shaped siblings (`segment`, `skeleton`,
 * motion configs) attached as direct properties; the recipe stays callable.
 * @throws If a child slot is named `base`, or declares its own `defaults` or
 * `slots`, because the unit holds the defaults and a slot does not nest.
 * @throws If an extras key collides with a function built-in or `config`.
 */
export function defineKata<C extends UnitInput>(config: C): Kata<C> & GroupExtrasOf<C>
export function defineKata<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Kata<C> & GroupExtrasOf<C> & X
export function defineKata<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Kata<C> | (Kata<C> & X) {
	const { slots: configs, defaults, extras: attached } = inherit('defineKata', config, extras)

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
