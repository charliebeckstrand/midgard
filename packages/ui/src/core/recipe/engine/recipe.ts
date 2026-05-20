/**
 * defineRecipe — the recipe primitive.
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
 *
 * The kata exports the recipe as `k`; callers use `k(...)` for the variant
 * call and `k.title` for slot classes — one binding per kata.
 */

import type { ClassValue } from 'clsx'
import clsx from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

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
])

const twMerge = extendTailwindMerge({
	extend: { theme: { spacing: ['xs', 'sm', 'md', 'lg', 'xl'] } },
})

export function defineRecipe<C extends RecipeConfig>(config: C): Recipe<C> {
	const resolved = expand(config)

	const slotCache: Record<string, string> = {}

	for (const [slot, value] of Object.entries(resolved.slots)) {
		slotCache[slot] = twMerge(clsx(value))
	}

	function recipe(props?: ComputedProps<C>): string {
		// Merge defaults with non-undefined props only. Spreading raw props would
		// let `color: undefined` (a destructured-but-unset prop on the consumer)
		// clobber the default and skip compound rules that match on it.
		const values: Record<string, string | undefined> = {}

		for (const [key, value] of Object.entries(resolved.defaults)) {
			values[key] = value === undefined || value === null ? undefined : String(value)
		}

		if (props) {
			for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
				if (value === undefined || value === null) continue
				// Coerce booleans and numbers so callers can pass `soft: false` or
				// `level: 1` against axes keyed by `'true'`/`'false'` or `'1'`/`'2'`.
				values[key] = String(value)
			}
		}

		const acc: ClassValue[] = [resolved.base]

		for (const [axis, axisMap] of Object.entries(resolved.variants)) {
			const value = values[axis]

			if (value !== undefined && value in axisMap) acc.push(axisMap[value])
		}

		for (const rule of resolved.compound) {
			if (matches(rule, values)) acc.push(rule.class)
		}

		return twMerge(clsx(acc))
	}

	Object.assign(recipe, slotCache)

	Object.defineProperty(recipe, 'config', { value: resolved, enumerable: false })

	// The slot properties and `.config` are attached at runtime; the type
	// system can't see them. Assert the final shape.
	return recipe as Recipe<C>
}

function matches(rule: CompoundRule, values: Record<string, string | undefined>): boolean {
	for (const [key, required] of Object.entries(rule)) {
		if (key === 'class') continue

		if (required !== values[key]) return false
	}

	return true
}

/**
 * Collects each non-reserved top-level field as a variant axis, then expands
 * `palette` into the `color` axis plus per-(variant × colour) compounds.
 * Palette-matrix keys missing from `variant:` are added as empty entries —
 * valid values with no structural class.
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

		// Union palette-matrix keys into the `variant` axis so palette-only
		// variants don't need a separate entry in the variant scaffold.
		const variantAxis = variants.variant ?? {}

		for (const variantValue of Object.keys(config.palette.matrix)) {
			if (!(variantValue in variantAxis)) variantAxis[variantValue] = ''
		}

		variants.variant = variantAxis
		variants.color = ex.colorScaffold

		compound.push(...ex.compound)
	}

	// User compounds run after palette compounds so they override.
	compound.push(...(config.compound ?? []))

	return {
		base: config.base,
		variants,
		compound,
		slots: config.slots ?? {},
		defaults: config.defaults ?? {},
	}
}
