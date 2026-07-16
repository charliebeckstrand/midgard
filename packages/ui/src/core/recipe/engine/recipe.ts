/**
 * The recipe primitive: {@link defineRecipe} and its config expansion.
 *
 * @remarks Per-call composition order is `base` → matching `variants` →
 * `compound` rules; `slots` pre-merge at creation, `palette` expands into the
 * `color` axis (`palette.ts`), and `skeleton` rides through as `k.skeleton`.
 * The call path is compiled once at creation (entries hoisted, defaults
 * pre-stringified, palette pairs folded into an O(1) lookup) and its output
 * memoised per variant combination, so render-hot call sites pay a key join
 * and a map hit after the first call with a given combination.
 */

import type { ClassValue } from 'clsx'
import clsx from 'clsx'

import { twMerge } from '../../tw-merge'
import { expandPalette } from './palette'
import type {
	CompoundRule,
	ComputedProps,
	Recipe,
	RecipeConfig,
	ReservedField,
	ResolvedConfig,
	VariantAxis,
} from './types'

const RESERVED: ReadonlySet<ReservedField> = new Set([
	'base',
	'palette',
	'compound',
	'slots',
	'defaults',
	'skeleton',
])

/**
 * Slot names the engine rejects: `name` / `length` / `caller` / `arguments`
 * collide with function properties (strict-mode assignment throws an opaque
 * `TypeError`), and `config` would be silently clobbered by the recipe's own
 * introspection property.
 */
const FORBIDDEN_SLOTS: ReadonlySet<string> = new Set([
	'name',
	'length',
	'caller',
	'arguments',
	'config',
])

/**
 * Memo entries per recipe. Combinations of declared axis values stay far
 * below this; the cap only guards a caller feeding unbounded dynamic strings
 * into a variant prop, resetting the memo instead of growing it.
 */
const MEMO_CAP = 1024

/** A compound rule pre-split into its conditions and class payload. @internal */
type CompiledRule = {
	conditions: [key: string, required: unknown][]
	class: ClassValue
}

/** The per-call execution plan {@link compile} derives once at creation. @internal */
type Plan = {
	base: ClassValue
	/** `Object.entries(variants)`, hoisted out of the call path. */
	variantEntries: [axis: string, axisMap: Record<string, ClassValue>][]
	/** Palette pair rules folded to `variant → color → classes`, in rule order. */
	palette: Map<string, Map<string, ClassValue[]>> | null
	/** User compound rules in declaration order, conditions pre-split. */
	rules: CompiledRule[]
	/** Defaults pre-coerced to their axis-lookup strings. */
	defaults: Record<string, string | undefined>
	/** Every key the output can depend on: axis names plus rule condition keys. */
	relevantKeys: string[]
}

/**
 * Builds a callable recipe from a `RecipeConfig`: `base`, `variants`,
 * `compound`, and `defaults` apply per call through `clsx` + `tailwind-merge`,
 * `slots` pre-merge onto the recipe as direct properties, `palette` expands
 * into an implicit `color` axis, and `extras` attach arbitrary kata-shaped
 * siblings. The kata binds the result as `k`: `k(...)` for the variant call,
 * `k.title` for slot classes.
 *
 * @remarks Calls are memoised per resolved variant combination: the first
 * call with a given combination composes and merges classes, every later one
 * returns the cached string.
 *
 * @param config - Recipe definition; reserved fields (`base`, `palette`,
 * `compound`, `slots`, `defaults`, `skeleton`) are special-cased, every other
 * top-level field becomes a variant axis.
 * @param extras - Optional kata-shaped siblings (`motion`, sub-recipes,
 * fragment maps) attached as direct properties; the recipe stays callable.
 * @throws If a slot name collides with a recipe property (`name`, `length`,
 * `caller`, `arguments`, `config`).
 * @see {@link expandPalette}
 */
export function defineRecipe<C extends RecipeConfig>(config: C): Recipe<C>
export function defineRecipe<C extends RecipeConfig, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Recipe<C> & X
export function defineRecipe<C extends RecipeConfig, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Recipe<C> | (Recipe<C> & X) {
	const { resolved, paletteRuleCount } = expand(config)

	const plan = compile(resolved, paletteRuleCount)

	const slotCache: Record<string, string> = {}

	for (const [slot, value] of Object.entries(resolved.slots)) {
		if (FORBIDDEN_SLOTS.has(slot)) {
			throw new Error(`defineRecipe: slot name "${slot}" collides with a recipe property`)
		}

		slotCache[slot] = twMerge(clsx(value))
	}

	const memo = new Map<string, string>()

	function recipe(props?: ComputedProps<C>): string {
		const raw = props as Record<string, unknown> | undefined

		const key = memoKey(plan, raw)

		const hit = memo.get(key)

		if (hit !== undefined) return hit

		const result = twMerge(clsx(collectRecipeClasses(plan, buildRecipeValues(plan, raw))))

		if (memo.size >= MEMO_CAP) memo.clear()

		memo.set(key, result)

		return result
	}

	Object.assign(recipe, slotCache)

	if (config.skeleton !== undefined) Object.assign(recipe, { skeleton: config.skeleton })

	if (extras) Object.assign(recipe, extras)

	Object.defineProperty(recipe, 'config', { value: resolved, enumerable: false })

	// Assert the final shape: slot properties, `.config`, and extras attach
	// at runtime, invisible to the type system.
	return recipe as Recipe<C> & X
}

/**
 * Resolves the value the pipeline reads for `key`: the caller's own prop when
 * present (nullish falls back), else the pre-stringified default.
 *
 * @internal
 */
function resolveValue(
	plan: Plan,
	props: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const raw = props !== undefined && Object.hasOwn(props, key) ? props[key] : undefined

	return raw === undefined || raw === null ? plan.defaults[key] : String(raw)
}

/**
 * The memo key for a call: the resolved value of every relevant key joined on
 * `\u0000`, with `\u0001` marking absent values. Exact because the composed
 * output reads nothing outside `relevantKeys`.
 *
 * @internal
 */
function memoKey(plan: Plan, props: Record<string, unknown> | undefined): string {
	let key = ''

	for (const k of plan.relevantKeys) {
		const value = resolveValue(plan, props, k)

		key += value === undefined ? '\u0001\u0000' : `${value}\u0000`
	}

	return key
}

/** Materialises the resolved values map for a memo miss. @internal */
function buildRecipeValues(
	plan: Plan,
	props: Record<string, unknown> | undefined,
): Record<string, string | undefined> {
	const values: Record<string, string | undefined> = {}

	for (const key of plan.relevantKeys) values[key] = resolveValue(plan, props, key)

	return values
}

/** True when every pre-split condition in `rule` equals the resolved value. @internal */
function matches(rule: CompiledRule, values: Record<string, string | undefined>): boolean {
	for (const [key, required] of rule.conditions) {
		if (required !== values[key]) return false
	}

	return true
}

/**
 * Composes base + matching variant axes + the palette pair + compound rules
 * into the class list. Order matches the pre-compiled engine: palette classes
 * land before user compound classes, so user rules still win merge conflicts.
 *
 * @internal
 */
function collectRecipeClasses(
	plan: Plan,
	values: Record<string, string | undefined>,
): ClassValue[] {
	const acc: ClassValue[] = [plan.base]

	for (const [axis, axisMap] of plan.variantEntries) {
		const value = values[axis]

		if (value !== undefined && value in axisMap) acc.push(axisMap[value])
	}

	if (plan.palette !== null && values.variant !== undefined && values.color !== undefined) {
		const paletteClasses = plan.palette.get(values.variant)?.get(values.color)

		if (paletteClasses !== undefined) acc.push(paletteClasses)
	}

	for (const rule of plan.rules) {
		if (matches(rule, values)) acc.push(rule.class)
	}

	return acc
}

/**
 * Folds the engine's palette pair rules — each an exact `variant` × `color`
 * pair — into a nested `variant → color → classes` lookup. A colour key can
 * carry both a matrix rule and an overlay rule; appending preserves their
 * relative order for the merge.
 *
 * @internal
 */
function foldPaletteRules(pairRules: CompoundRule[]): NonNullable<Plan['palette']> {
	const palette = new Map<string, Map<string, ClassValue[]>>()

	for (const rule of pairRules) {
		const variant = rule.variant as string

		const color = rule.color as string

		let colors = palette.get(variant)

		if (colors === undefined) {
			colors = new Map()

			palette.set(variant, colors)
		}

		const classes = colors.get(color)

		if (classes === undefined) colors.set(color, [rule.class])
		else classes.push(rule.class)
	}

	return palette
}

/**
 * Derives the per-call execution plan once at creation: variant entries
 * hoisted, defaults pre-stringified, the engine's palette pair rules (the
 * first `paletteRuleCount` compounds) folded into an O(1) nested lookup via
 * {@link foldPaletteRules}, and user rules pre-split so matching allocates
 * nothing.
 *
 * @internal
 */
function compile(resolved: ResolvedConfig, paletteRuleCount: number): Plan {
	const defaults: Record<string, string | undefined> = {}

	for (const [key, value] of Object.entries(resolved.defaults)) {
		defaults[key] = value === undefined || value === null ? undefined : String(value)
	}

	const palette =
		paletteRuleCount > 0 ? foldPaletteRules(resolved.compound.slice(0, paletteRuleCount)) : null

	const rules: CompiledRule[] = resolved.compound.slice(paletteRuleCount).map((rule) => ({
		conditions: Object.entries(rule).filter(([key]) => key !== 'class'),
		class: rule.class,
	}))

	const relevant = new Set(Object.keys(resolved.variants))

	for (const rule of rules) for (const [key] of rule.conditions) relevant.add(key)

	return {
		base: resolved.base,
		variantEntries: Object.entries(resolved.variants),
		palette,
		rules,
		defaults,
		relevantKeys: [...relevant],
	}
}

/**
 * Splices a palette into the `variant` and `color` axes (mutating `variants`)
 * and returns its compound rules. Palette-matrix variant keys absent from an
 * explicit `variant:` axis join it as empty entries — valid values with no
 * structural class; the `color` axis becomes the palette's colour scaffold.
 *
 * @internal
 */
function applyPaletteToVariants(
	variants: Record<string, Record<string, ClassValue>>,
	palette: NonNullable<RecipeConfig['palette']>,
): CompoundRule[] {
	const ex = expandPalette(palette)

	const variantAxis = variants.variant ?? {}

	for (const variantValue of Object.keys(palette.matrix)) {
		if (!(variantValue in variantAxis)) variantAxis[variantValue] = ''
	}

	variants.variant = variantAxis

	variants.color = ex.colorScaffold

	return ex.compound
}

/**
 * Collects each non-reserved top-level field as a variant axis, then splices
 * `palette` into the `variant` / `color` axes and compounds via
 * {@link applyPaletteToVariants}. Reports how many leading compound rules are
 * palette pairs, so {@link compile} folds exactly those into the pair lookup
 * and leaves user rules in declaration order.
 *
 * @internal
 */
function expand(config: RecipeConfig): { resolved: ResolvedConfig; paletteRuleCount: number } {
	const variants: Record<string, Record<string, ClassValue>> = {}

	for (const [key, value] of Object.entries(config)) {
		if (RESERVED.has(key as ReservedField)) continue

		variants[key] = { ...(value as VariantAxis) }
	}

	const compound = config.palette ? applyPaletteToVariants(variants, config.palette) : []

	const paletteRuleCount = compound.length

	// User compounds follow palette compounds; later rules take precedence.
	compound.push(...(config.compound ?? []))

	return {
		resolved: {
			base: config.base,
			variants,
			compound,
			slots: config.slots ?? {},
			defaults: config.defaults ?? {},
		},
		paletteRuleCount,
	}
}
