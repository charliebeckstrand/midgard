/**
 * defineKata: the recipe of a unit. A unit is a set of slots, and each slot is a
 * recipe, in the shape that `defineRecipe` takes. The slots share one set of
 * props, so one call resolves each slot: `k({ orientation }).list`. The config
 * is the recipe of the root slot `base`, and `slots` holds the child slots. A
 * child slot with no axes can be only its classes.
 *
 * A child slot can hold child slots of its own under `slots`. The output of that
 * slot is then a record, as the output of the unit is: its own classes are
 * `base`, and each child slot has its name (`k().chevron.base`,
 * `k().chevron.spacer`). A slot that holds only child slots has no `base`.
 *
 * A slot declares only the axes that change it. An axis with the same name in
 * two slots is one prop, and the unit holds the defaults of each prop once.
 *
 * defineGroup: the shared structure of a family of units, in the same shape. A
 * group is data, not a callable. A unit that `extends` a group gets each slot,
 * axis, default, and extra of the group, and adds its own. One rule merges the
 * two for each family (see {@link mergeSlot}).
 *
 * A slot declares a responsive axis under `responsive`. The prop of that axis
 * takes a value or a map of values by breakpoint, and the slot takes the
 * classes of each value behind the prefix of its breakpoint (see
 * {@link resolveVariant}).
 */

import clsx, { type ClassValue } from 'clsx'
import {
	atBreakpoint,
	BREAKPOINTS,
	type Breakpoint,
	type Responsive,
	valueAt,
} from '../../../types/responsive'
import { twMerge } from '../../tw-merge'
import { axisKey, defineRecipe, RESERVED } from './recipe'
import type { CompoundRule, ComputedProps, RecipeConfig, ResolvedConfig } from './types'

/** The default of each prop of a unit. */
type Defaults = Record<string, string | number | boolean>

/** A slot as the engine holds it: a recipe config. Each field that is not reserved is an axis. */
type Slot = RecipeConfig & Record<string, unknown>

/** The slots of a group or a unit, by name. The root slot is `base`. */
type Slots = Record<string, Slot>

/** The responsive axes of a slot, by name. */
type ResponsiveAxes = Record<string, Record<string, ClassValue>>

/**
 * A child slot as a config writes it: a recipe config, or only its classes. A
 * recipe config can hold child slots of its own under `slots`.
 */
type SlotInput =
	| string
	| readonly ClassValue[]
	| (Omit<Slot, 'slots' | 'defaults'> &
			Record<string, unknown> & {
				responsive?: ResponsiveAxes
				slots?: { readonly [name: string]: SlotInput }
			})

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
		responsive?: ResponsiveAxes
	}

/** The shared structure of a family of units, which a unit `extends`. */
export type Group<S = Slots, X = unknown, R extends string = string> = {
	readonly slots: S
	readonly defaults: Defaults
	readonly extras: X
	/** The names of the responsive axes of the slots. */
	readonly responsive: readonly R[]
}

/** The slots of a group and of a unit, merged: a slot in both takes the axes of both. */
type Merged<A, B> = {
	[K in keyof A | keyof B]: (K extends keyof A ? A[K] : unknown) &
		(K extends keyof B ? B[K] : unknown)
}

/** A slot with its responsive axes as axes. */
type Lifted<S> = S extends { responsive: infer R } ? Omit<S, 'responsive'> & R : S

/** A child slot as a recipe config: a slot written as its classes is its `base`. */
type Child<S> = S extends string | readonly unknown[] ? { base: S } : Lifted<S>

/** The child slots of a slot, or none. */
type Children<S> = S extends { slots: infer N } ? N : Record<never, never>

/** True when a slot declares classes or axes beside its child slots. */
type HasOwn<S> = [keyof Omit<S, 'slots'>] extends [never] ? false : true

/**
 * The class strings of a slot: a string, or, for a slot with child slots, a
 * record with its own classes as `base` and each child slot by name.
 */
type SlotOutput<S> = S extends { slots: infer N }
	? (HasOwn<S> extends true ? { readonly base: string } : unknown) & {
			readonly [K in keyof N]: SlotOutput<Child<N[K]>>
		}
	: string

/** The recipe configs of a slot and of each slot under it, as a union. */
type Configs<S> = S extends { slots: infer N }
	? Omit<S, 'slots'> | { [K in keyof N]: Configs<Child<N[K]>> }[keyof N]
	: S

/** The props of each recipe config of a union, as a union. */
type SlotAxes<S> = S extends unknown ? ComputedProps<S> : never

/** The root slot of a config: each field that is not a unit field. */
type Root<C> = Lifted<Omit<C, UnitField>>

/**
 * The names of the responsive axes of one slot as a config writes it, and of
 * each slot under it, to a depth of four slots (`D` counts the depth).
 */
type SlotKeys<S, D extends unknown[] = []> =
	| (S extends { responsive: infer R } ? keyof R & string : never)
	| (D['length'] extends 4
			? never
			: { [K in keyof Children<S>]: SlotKeys<Children<S>[K], [...D, 0]> }[keyof Children<S>])

/** The names of the responsive axes of a config: its own, and the axes of its group. */
type ResponsiveKeys<C> =
	| SlotKeys<C>
	| (C extends { extends: Group<unknown, unknown, infer R> } ? R : never)

/** The props of a unit with each responsive axis as a {@link Responsive} value. */
type ResponsiveProps<P, R> = [R] extends [never]
	? P
	: { [K in keyof P]: K extends R ? Responsive<NonNullable<P[K]>> : P[K] }

/** The slots that a config declares: its root, and each child slot. */
type OwnSlots<C> = { base: Root<C> } & (C extends { slots: infer S }
	? { [K in keyof S]: Child<S[K]> }
	: Record<never, never>)

/** The slots of a unit: its own, merged over the slots of the group that it extends. */
type UnitSlots<C> = C extends { extends: Group<infer G> } ? Merged<G, OwnSlots<C>> : OwnSlots<C>

/** The extras of the group that a unit extends, or none. */
type Extras<C> = C extends { extends: Group<unknown, infer X> } ? X : unknown

/** The intersection of a union of prop shapes: one shape with the fields of each. */
type Intersection<U> = (U extends unknown ? (value: U) => void : never) extends (
	value: infer I,
) => void
	? I
	: never

/** The props of a unit: the props of each slot, merged. An axis in two slots is one prop. */
export type KataProps<C> = ResponsiveProps<
	Intersection<
		{ [K in keyof UnitSlots<C>]: SlotAxes<Configs<UnitSlots<C>[K]>> }[keyof UnitSlots<C>]
	>,
	ResponsiveKeys<C>
>

/** The class strings of each slot of a unit (see {@link SlotOutput}). */
export type KataOutput<C> = { readonly [K in keyof UnitSlots<C>]: SlotOutput<UnitSlots<C>[K]> }

/**
 * The resolved config of a unit, for introspection. `variants` holds each axis
 * of each slot, with the classes that each value gives to each slot, and
 * `slots` holds the resolved config of each slot. A slot under a slot has its
 * path as its name: `chevron.spacer`.
 */
export type KataResolvedConfig<C = UnitInput> = {
	defaults: Defaults
	/** The names of the responsive axes. */
	responsive: readonly string[]
	variants: Record<string, Record<string, Record<string, ClassValue>>>
	slots: { readonly [K in keyof UnitSlots<C>]: ResolvedConfig } & {
		readonly [path: string]: ResolvedConfig
	}
}

export type Kata<C> = {
	(props?: KataProps<C>): KataOutput<C>
	/** Resolved config, exposed for introspection. */
	readonly config: KataResolvedConfig<C>
	/**
	 * The output of the unit with no classes: each class string is empty. A
	 * headless component renders it in place of `k(props)` (`useSlots`).
	 */
	readonly bare: KataOutput<C>
}

/**
 * Memo entries per unit. Combinations of declared axis values stay far below
 * this. The cap only guards a caller that feeds unbounded dynamic strings into
 * a prop, and resets the memo instead of growing it.
 */
const MEMO_CAP = 1024

/** True when a prop value is a map of values by breakpoint. @internal */
function isMap(value: unknown): value is Partial<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The string that a prop value gives to a memo key. A nullish value is absent. @internal */
function toKeyPart(value: unknown): string {
	if (value === undefined || value === null) return '\u0001'

	if (isMap(value)) return BREAKPOINTS.map((bp) => toKeyPart(value[bp])).join('\u0002')

	return String(value)
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
 * @throws If a child slot is named `base`, or declares its own `defaults`.
 * @internal
 */
function readSlots(caller: string, config: UnitInput): { slots: Slots; responsive: Set<string> } {
	const root = Object.entries(config).filter(([key]) => !UNIT_FIELDS.has(key))

	const slots: Slots = root.length > 0 ? { base: Object.fromEntries(root) } : {}

	readChildren(caller, config.slots ?? {}, undefined, slots)

	return { slots, responsive: liftResponsive(caller, slots) }
}

/**
 * The path of a child slot: the path of its parent, a dot, and its name.
 *
 * @throws If the name is `base` or has a dot.
 * @internal
 */
function readPath(caller: string, name: string, parent: string | undefined): string {
	if (name === 'base') {
		throw new Error(
			parent === undefined
				? `${caller}: the root slot "base" is the config itself`
				: `${caller}: the classes of slot "${parent}" are its config itself, not a child "base"`,
		)
	}

	const path = parent === undefined ? name : `${parent}.${name}`

	if (name.includes('.')) throw new Error(`${caller}: slot "${path}" has a dot in its name`)

	return path
}

/**
 * Adds each child slot of a slot to `slots`, by its path. A slot under a slot
 * has the path of its parent, a dot, and its name: `chevron.spacer`. The fields
 * of a slot other than `slots` are its own recipe, and a slot with none adds
 * only its child slots.
 *
 * @throws If a child slot is named `base` or has a dot in its name, or declares its own `defaults`.
 * @internal
 */
function readChildren(
	caller: string,
	children: Readonly<Record<string, SlotInput>>,
	parent: string | undefined,
	slots: Slots,
): void {
	for (const [name, value] of Object.entries(children)) {
		const path = readPath(caller, name, parent)

		if (typeof value === 'string' || Array.isArray(value)) {
			slots[path] = { base: value } as Slot

			continue
		}

		const { slots: nested, ...own } = value as Slot & {
			slots?: Readonly<Record<string, SlotInput>>
		}

		if (own.defaults !== undefined) throw new Error(`${caller}: slot "${path}" declares defaults`)

		if (Object.keys(own).length > 0) slots[path] = own as Slot

		if (nested !== undefined) readChildren(caller, nested, path, slots)
	}
}

/**
 * Nests the class string of each slot by its path. A slot with child slots
 * gives a record, with its own classes as `base`.
 *
 * @internal
 */
function nest(entries: ReadonlyArray<readonly [path: string, classes: string]>) {
	const parents = new Set(
		entries.flatMap(([path]) =>
			path
				.split('.')
				.slice(0, -1)
				.map((_, index, keys) => keys.slice(0, index + 1).join('.')),
		),
	)

	const output: Record<string, unknown> = {}

	const records: Record<string, unknown>[] = [output]

	for (const [path, classes] of entries) {
		const keys = path.split('.')

		if (parents.has(path)) keys.push('base')

		const last = keys.pop() as string

		let record = output

		for (const key of keys) {
			if (record[key] === undefined) {
				const child: Record<string, unknown> = {}

				records.push(child)

				record[key] = child
			}

			record = record[key] as Record<string, unknown>
		}

		record[last] = classes
	}

	for (const record of records) Object.freeze(record)

	return output
}

/**
 * Moves the responsive axes of each slot among its axes, in place.
 *
 * @returns The names of the responsive axes.
 * @throws If a slot declares an axis as responsive and as plain.
 * @internal
 */
function liftResponsive(caller: string, slots: Slots): Set<string> {
	const responsive = new Set<string>()

	for (const [name, slot] of Object.entries(slots)) {
		const { responsive: axes, ...rest } = slot as Slot & { responsive?: ResponsiveAxes }

		if (axes === undefined) continue

		for (const axis of Object.keys(axes)) {
			if (Object.hasOwn(rest, axis)) {
				throw new Error(`${caller}: slot "${name}" declares the axis "${axis}" twice`)
			}

			responsive.add(axis)
		}

		slots[name] = { ...rest, ...axes } as Slot
	}

	return responsive
}

/** A slot recipe of a unit, by name. */
type SlotRecipe = readonly [name: string, recipe: ReturnType<typeof defineRecipe>]

/**
 * A rule of a slot that a breakpoint can prefix: a value of a responsive axis,
 * or a compound rule that reads one. A value is a rule with one condition.
 */
type ResponsiveRule = {
	readonly conditions: ReadonlyArray<readonly [axis: string, value: string]>
	readonly classes: string
}

/**
 * Reads the rules of each slot that a breakpoint can prefix, with the classes
 * of each as one string: each value of a responsive axis, and each compound
 * rule that reads a responsive axis. A rule with no classes is left out.
 *
 * @internal
 */
function readResponsive(slots: readonly SlotRecipe[], responsive: Set<string>): ResponsiveRule[][] {
	return slots.map(([, recipe]) => {
		const values = [...responsive].flatMap((axis) =>
			Object.entries(recipe.config.variants[axis] ?? {}).map(([value, classes]) => ({
				[axis]: value,
				class: classes,
			})),
		)

		return [...values, ...recipe.config.compound].flatMap((rule: CompoundRule) => {
			const { class: value, ...rest } = rule

			const conditions = Object.entries(rest as Record<string, string>)

			// A rule that reads no responsive axis is left out before its merge.
			if (!conditions.some(([axis]) => responsive.has(axis))) return []

			const classes = twMerge(clsx(value))

			return classes === '' ? [] : [{ conditions, classes }]
		})
	})
}

/**
 * The classes of a slot behind the prefix of each breakpoint that a map of a
 * responsive axis names, in breakpoint order. The `initial` value takes no
 * prefix, so the recipe of the slot gives it.
 *
 * A rule applies at a breakpoint where a map of an axis that it reads names a
 * value, when each of its conditions holds for the values in force there
 * (`valueAt`). The rules over the values of an axis write the same
 * properties, so a breakpoint replaces the classes of the rule below it.
 *
 * @internal
 */
function prefixed(
	rules: readonly ResponsiveRule[],
	props: Record<string, unknown>,
	defaults: Defaults,
): string[] {
	if (rules.length === 0) return []

	const named = (axis: string, bp: Breakpoint) => {
		const map = props[axis]

		return isMap(map) && map[bp] !== undefined
	}

	const current = (axis: string, bp: Breakpoint) =>
		axisKey(valueAt(props[axis] as Responsive<unknown>, bp, defaults[axis]) ?? defaults[axis])

	return BREAKPOINTS.flatMap((bp) =>
		rules
			.filter(
				({ conditions }) =>
					bp !== 'initial' &&
					conditions.some(([axis]) => named(axis, bp)) &&
					conditions.every(([axis, value]) => current(axis, bp) === value),
			)
			.map(({ classes }) => atBreakpoint(classes, bp)),
	)
}

/**
 * The props of a call with each map of a responsive axis as its `initial`
 * value, so the recipe of each slot gives the classes below the first
 * breakpoint. With no `initial` value, the default of the axis holds there.
 *
 * @internal
 */
function initialProps(
	props: Record<string, unknown> | undefined,
	responsive: Set<string>,
): Record<string, unknown> | undefined {
	if (props === undefined) return props

	const maps = [...responsive].filter((axis) => isMap(props[axis]))

	if (maps.length === 0) return props

	return {
		...props,
		...Object.fromEntries(
			maps.map((axis) => [axis, (props[axis] as Partial<Record<string, unknown>>).initial]),
		),
	}
}

/**
 * Merges a unit or a group over the group that it extends: each slot, the
 * defaults, and the extras. A config that extends no group keeps its own.
 *
 * @throws If a child slot is named `base`, or declares its own `defaults`.
 * @internal
 */
function inherit(caller: string, config: UnitInput, extras?: Record<string, unknown>) {
	const { extends: group } = config

	const { slots: own, responsive } = readSlots(caller, config)

	for (const axis of group?.responsive ?? []) responsive.add(axis)

	const slots: Slots = {}

	for (const name of new Set(['base', ...Object.keys(group?.slots ?? {}), ...Object.keys(own)])) {
		slots[name] = mergeSlot(name, group?.slots[name], own[name])
	}

	return {
		slots,
		defaults: { ...group?.defaults, ...config.defaults },
		extras: group === undefined ? extras : { ...(group.extras as object), ...extras },
		responsive,
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
 * @throws If a child slot is named `base`, or declares its own `defaults`.
 */
export function defineGroup<C extends UnitInput>(
	config: C,
): Group<UnitSlots<C>, Extras<C>, ResponsiveKeys<C>>
export function defineGroup<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Group<UnitSlots<C>, Extras<C> & X, ResponsiveKeys<C>>
export function defineGroup(config: UnitInput, extras?: Record<string, unknown>): Group {
	const {
		slots,
		defaults,
		extras: merged = {},
		responsive,
	} = inherit('defineGroup', config, extras)

	return Object.freeze({ slots, defaults, extras: merged, responsive: [...responsive] })
}

/**
 * Builds the recipe of a unit from the recipe of each slot.
 *
 * @param config - The recipe of the root slot `base` (`base`, `palette`,
 * `compound`, and the axes), the child `slots`, and the `defaults` of the
 * props that the slots share. A child slot is a recipe config, or only its
 * classes, and a recipe config can hold child slots under `slots`. With `extends`, the unit merges its slots over the slots of the
 * group, its defaults over the defaults of the group, and its extras over the
 * extras of the group (see {@link mergeSlot}).
 * @param extras - Optional kata-shaped siblings (`segment`, `skeleton`,
 * motion configs) attached as direct properties; the recipe stays callable.
 * @throws If a child slot is named `base`, or declares its own `defaults`,
 * because the unit holds the defaults.
 * @throws If an extras key collides with a function built-in, `config`, or `bare`.
 */
export function defineKata<C extends UnitInput>(config: C): Kata<C> & Extras<C>
export function defineKata<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Kata<C> & Extras<C> & X
export function defineKata<C extends UnitInput, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Kata<C> | (Kata<C> & X) {
	const {
		slots: configs,
		defaults,
		extras: attached,
		responsive,
	} = inherit('defineKata', config, extras)

	const slots = Object.entries(configs).map(
		([name, slot]) => [name, defineRecipe({ ...slot, defaults })] as const,
	)

	const rules = readResponsive(slots, responsive)

	const names = [...new Set(slots.flatMap(([, recipe]) => readPropNames(recipe.config)))]

	const memo = new Map<string, KataOutput<C>>()

	function kata(props?: KataProps<C>): KataOutput<C> {
		const raw = props as Record<string, unknown> | undefined

		const key = names.map((name) => toKeyPart(raw?.[name] ?? defaults[name])).join('\u0000')

		const hit = memo.get(key)

		if (hit !== undefined) return hit

		const flat = initialProps(raw, responsive)

		const result = nest(
			slots.map(([name, recipe], index) => {
				const classes = recipe(flat)

				const extra = flat === raw ? [] : prefixed(rules[index] ?? [], raw ?? {}, defaults)

				return [
					name,
					extra.length === 0 ? classes : [classes, ...extra].filter(Boolean).join(' '),
				] as const
			}),
		) as KataOutput<C>

		if (memo.size >= MEMO_CAP) memo.clear()

		memo.set(key, result)

		return result
	}

	if (attached !== undefined) {
		for (const key of Object.keys(attached)) {
			if (key in kata || key === 'config' || key === 'bare') {
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
		responsive: [...responsive],
		variants,
		slots: Object.fromEntries(slots.map(([name, recipe]) => [name, recipe.config])),
	} as unknown as KataResolvedConfig<C>

	Object.defineProperty(kata, 'config', { value: resolved, enumerable: false })

	const bare = nest(slots.map(([name]) => [name, ''] as const))

	Object.defineProperty(kata, 'bare', { value: bare, enumerable: false })

	return kata as Kata<C> & X
}
