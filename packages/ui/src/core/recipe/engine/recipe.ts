/**
 * defineRecipe: the recipe primitive.
 *
 * Builds a callable recipe from a `RecipeConfig`:
 *
 *   - `base`, `variants`, `compound`, `defaults` apply in that order per
 *     call. Composition runs through `clsx` (conditional input) and
 *     `tailwind-merge` (conflict resolution).
 *   - `slots` are pre-merged at creation time and attached to the recipe
 *     as direct properties (`recipe.title`, `recipe.body`).
 *   - `palette` expands at creation time into an implicit `color` axis
 *     plus compound rules. See `palette.ts`.
 *   - `skeleton` is reserved at the config root and attaches to the
 *     recipe as `k.skeleton` with its caller-inferred type.
 *   - `extras` (optional second argument) attaches arbitrary kata-shaped
 *     siblings to the recipe: `motion`, sub-recipes, fragment maps.
 *     The returned recipe stays callable as `k({...})` and gains the
 *     extras as direct properties (`k.motion`).
 *
 * The kata exports the recipe as `k`; callers use `k(...)` for the variant
 * call and `k.title` for slot classes; one binding per kata.
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

export function defineRecipe<C extends RecipeConfig>(config: C): Recipe<C>
export function defineRecipe<C extends RecipeConfig, X extends Record<string, unknown>>(
	config: C,
	extras: X,
): Recipe<C> & X
export function defineRecipe<C extends RecipeConfig, X extends Record<string, unknown>>(
	config: C,
	extras?: X,
): Recipe<C> | (Recipe<C> & X) {
	const resolved = expand(config)

	const slotCache: Record<string, string> = {}

	for (const [slot, value] of Object.entries(resolved.slots)) {
		slotCache[slot] = twMerge(clsx(value))
	}

	function recipe(props?: ComputedProps<C>): string {
		const values = buildRecipeValues(resolved, props as Record<string, unknown> | undefined)

		return twMerge(clsx(collectRecipeClasses(resolved, values)))
	}

	Object.assign(recipe, slotCache)

	if (config.skeleton !== undefined) Object.assign(recipe, { skeleton: config.skeleton })

	if (extras) Object.assign(recipe, extras)

	Object.defineProperty(recipe, 'config', { value: resolved, enumerable: false })

	// Assert the final shape: slot properties, `.config`, and extras attach
	// at runtime, invisible to the type system.
	return recipe as Recipe<C> & X
}

function matches(rule: CompoundRule, values: Record<string, string | undefined>): boolean {
	for (const [key, required] of Object.entries(rule)) {
		if (key === 'class') continue

		if (required !== values[key]) return false
	}

	return true
}

// Merges defaults with props (skipping null/undefined), coercing booleans and
// numbers to strings for axis lookup.
function buildRecipeValues(
	resolved: ResolvedConfig,
	props: Record<string, unknown> | undefined,
): Record<string, string | undefined> {
	const values: Record<string, string | undefined> = {}

	for (const [key, value] of Object.entries(resolved.defaults)) {
		values[key] = value === undefined || value === null ? undefined : String(value)
	}

	if (props) {
		for (const [key, value] of Object.entries(props)) {
			if (value === undefined || value === null) continue

			values[key] = String(value)
		}
	}

	return values
}

// Composes base + matching variant axes + compound rules into the class list.
function collectRecipeClasses(
	resolved: ResolvedConfig,
	values: Record<string, string | undefined>,
): ClassValue[] {
	const acc: ClassValue[] = [resolved.base]

	for (const [axis, axisMap] of Object.entries(resolved.variants)) {
		const value = values[axis]

		if (value !== undefined && value in axisMap) acc.push(axisMap[value])
	}

	for (const rule of resolved.compound) {
		if (matches(rule, values)) acc.push(rule.class)
	}

	return acc
}

/**
 * Collects each non-reserved top-level field as a variant axis, then expands
 * `palette` into the `color` axis plus per-(variant × colour) compounds.
 * Palette-matrix keys missing from `variant:` become empty entries (valid
 * values with no structural class).
 */
function expand(config: RecipeConfig): ResolvedConfig {
	const variants: Record<string, Record<string, ClassValue>> = {}

	for (const [key, value] of Object.entries(config)) {
		if (RESERVED.has(key as ReservedField)) continue

		variants[key] = { ...(value as VariantAxis) }
	}

	const compound: CompoundRule[] = []

	if (config.palette) {
		const ex = expandPalette(config.palette)

		// Unions palette-matrix keys into the `variant` axis as empty entries.
		const variantAxis = variants.variant ?? {}

		for (const variantValue of Object.keys(config.palette.matrix)) {
			if (!(variantValue in variantAxis)) variantAxis[variantValue] = ''
		}

		variants.variant = variantAxis

		variants.color = ex.colorScaffold

		compound.push(...ex.compound)
	}

	// User compounds follow palette compounds; later rules take precedence.
	compound.push(...(config.compound ?? []))

	return {
		base: config.base,
		variants,
		compound,
		slots: config.slots ?? {},
		defaults: config.defaults ?? {},
	}
}
