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
import { expandPalette, type PalettePairs } from './palette'
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
	/** The palette's pair lookup from {@link expandPalette}; empty without a palette. */
	palette: PalettePairs
	/** User compound rules in declaration order, conditions pre-split. */
	rules: CompiledRule[]
	/** Defaults pre-coerced to their axis-lookup strings. */
	defaults: Record<string, string | undefined>
	/** Every key the output can depend on: axis names plus rule condition keys. */
	relevantKeys: string[]
	/** The constant key a no-props call resolves to, precomputed. */
	defaultKey: string
}

/**
 * What {@link expand} hands {@link compile}: the public resolved config plus
 * the palette pair lookup and the user compound rules, pre-separated.
 *
 * @internal
 */
type Expansion = {
	resolved: ResolvedConfig
	palettePairs: PalettePairs
	userCompound: CompoundRule[]
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
 * @throws If a slot name collides with a recipe property — a function
 * built-in (`name`, `length`, `call`, …) or the engine-attached `config` /
 * `skeleton`.
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
	const expansion = expand(config)

	const { resolved } = expansion

	const plan = compile(expansion)

	const memo = new Map<string, string>()

	function recipe(props?: ComputedProps<C>): string {
		const raw = props as Record<string, unknown> | undefined

		const key = raw === undefined ? plan.defaultKey : memoKey(plan, raw)

		const hit = memo.get(key)

		if (hit !== undefined) return hit

		const result = twMerge(clsx(collectRecipeClasses(plan, buildRecipeValues(plan, raw))))

		if (memo.size >= MEMO_CAP) memo.clear()

		memo.set(key, result)

		return result
	}

	const slotCache: Record<string, string> = {}

	for (const [slot, value] of Object.entries(resolved.slots)) {
		// `in` sees the function built-ins (`name`, `length`, `call`, …) through
		// the prototype chain before anything is assigned; `config` and
		// `skeleton` are attached by the engine below.
		if (slot in recipe || slot === 'config' || slot === 'skeleton') {
			throw new Error(`defineRecipe: slot name "${slot}" collides with a recipe property`)
		}

		slotCache[slot] = twMerge(clsx(value))
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
	// A plain read: relevant keys are config-declared names, so an inherited
	// `Object.prototype` member can never alias one.
	const raw = props === undefined ? undefined : props[key]

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

	if (values.variant !== undefined && values.color !== undefined) {
		const paletteClasses = plan.palette.get(values.variant)?.get(values.color)

		if (paletteClasses !== undefined) acc.push(paletteClasses)
	}

	for (const rule of plan.rules) {
		if (matches(rule, values)) acc.push(rule.class)
	}

	return acc
}

/**
 * Derives the per-call execution plan once at creation: variant entries
 * hoisted, defaults pre-stringified, the palette pair lookup taken straight
 * from {@link expandPalette}, and user rules pre-split so matching allocates
 * nothing.
 *
 * @internal
 */
function compile({ resolved, palettePairs, userCompound }: Expansion): Plan {
	const defaults: Record<string, string | undefined> = {}

	for (const [key, value] of Object.entries(resolved.defaults)) {
		defaults[key] = value === undefined || value === null ? undefined : String(value)
	}

	const rules: CompiledRule[] = userCompound.map((rule) => ({
		conditions: Object.entries(rule).filter(([key]) => key !== 'class'),
		class: rule.class,
	}))

	const relevant = new Set(Object.keys(resolved.variants))

	for (const rule of rules) for (const [key] of rule.conditions) relevant.add(key)

	// The palette lookup reads `variant` and `color`; declare that dependency
	// here rather than leaning on the axis splice in `applyPaletteToVariants`.
	if (palettePairs.size > 0) {
		relevant.add('variant')

		relevant.add('color')
	}

	const plan: Plan = {
		base: resolved.base,
		variantEntries: Object.entries(resolved.variants),
		palette: palettePairs,
		rules,
		defaults,
		relevantKeys: [...relevant],
		defaultKey: '',
	}

	plan.defaultKey = memoKey(plan, undefined)

	return plan
}

/**
 * Splices a palette into the `variant` and `color` axes (mutating `variants`)
 * and returns its compound rules and pair lookup. Palette-matrix variant keys
 * absent from an explicit `variant:` axis join it as empty entries — valid
 * values with no structural class; the `color` axis becomes the palette's
 * colour scaffold.
 *
 * @internal
 */
function applyPaletteToVariants(
	variants: Record<string, Record<string, ClassValue>>,
	palette: NonNullable<RecipeConfig['palette']>,
): { compound: CompoundRule[]; pairs: PalettePairs } {
	const ex = expandPalette(palette)

	const variantAxis = variants.variant ?? {}

	for (const variantValue of Object.keys(palette.matrix)) {
		if (!(variantValue in variantAxis)) variantAxis[variantValue] = ''
	}

	variants.variant = variantAxis

	variants.color = ex.colorScaffold

	return { compound: ex.compound, pairs: ex.pairs }
}

/**
 * Collects each non-reserved top-level field as a variant axis, then splices
 * `palette` into the `variant` / `color` axes and compounds via
 * {@link applyPaletteToVariants}. Hands {@link compile} the palette pair
 * lookup and the user rules pre-separated; the resolved config keeps the
 * full flat rule list for `.config` introspection.
 *
 * @internal
 */
function expand(config: RecipeConfig): Expansion {
	const variants: Record<string, Record<string, ClassValue>> = {}

	for (const [key, value] of Object.entries(config)) {
		if (RESERVED.has(key as ReservedField)) continue

		variants[key] = { ...(value as VariantAxis) }
	}

	const paletteExpansion: { compound: CompoundRule[]; pairs: PalettePairs } = config.palette
		? applyPaletteToVariants(variants, config.palette)
		: { compound: [], pairs: new Map() }

	const userCompound = config.compound ?? []

	return {
		resolved: {
			base: config.base,
			variants,
			// User compounds follow palette compounds; later rules take precedence.
			compound: [...paletteExpansion.compound, ...userCompound],
			slots: config.slots ?? {},
			defaults: config.defaults ?? {},
		},
		palettePairs: paletteExpansion.pairs,
		userCompound,
	}
}
