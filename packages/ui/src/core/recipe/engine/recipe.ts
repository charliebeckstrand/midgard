/**
 * defineRecipe — the recipe primitive.
 *
 * Builds a callable recipe from a `RecipeConfig`:
 *
 *   - `base`, `variants`, `compound`, `defaults` — applied in that order
 *     per call. Class composition runs through `clsx` (conditional input)
 *     and `tailwind-merge` (conflict resolution).
 *   - `slots` — pre-merged once at recipe-creation time and merged onto the
 *     recipe as direct properties (e.g. `recipe.title`, `recipe.body`).
 *   - `palette` — expanded at creation time into an implicit `color` axis
 *     and a flock of compound rules. See `palette.ts`.
 *
 * The kata exports the recipe directly (typically as `k`); callers use
 * `k(...)` for the variant call and `k.title` for slot classes — a single
 * binding per kata.
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
		const raw = { ...resolved.defaults, ...(props as Record<string, unknown>) }

		// Axis lookup is by string key, so booleans and numbers get coerced.
		// Lets callers pass `soft: false` or `level: 1` against `{ true / false }`
		// and `{ 1 / 2 / … }` axes respectively.
		const values: Record<string, string | undefined> = {}

		for (const [key, value] of Object.entries(raw)) {
			values[key] = value === undefined || value === null ? undefined : String(value)
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

	// `recipe` is a function that we've dynamically extended with slot
	// properties (via Object.assign) and `.config` (via defineProperty). The
	// type system can't see those attachments, so we assert the final shape.
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
 * Walks the top-level config: collects each non-reserved field as a variant
 * axis, then expands `palette` into the `color` axis plus per-(variant ×
 * colour) compounds. Variants declared in the palette matrix but not in the
 * kata's `variant:` scaffold are added as empty entries — they're valid
 * values, just with no structural class.
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
		// variants don't have to be repeated in the kata's variant scaffold.
		const variantAxis = variants.variant ?? {}

		for (const variantValue of Object.keys(config.palette.matrix)) {
			if (!(variantValue in variantAxis)) variantAxis[variantValue] = ''
		}

		variants.variant = variantAxis
		variants.color = ex.colorScaffold

		compound.push(...ex.compound)
	}

	// User compounds applied AFTER palette compounds so they can override
	compound.push(...(config.compound ?? []))

	return {
		base: config.base,
		variants,
		compound,
		slots: config.slots ?? {},
		defaults: config.defaults ?? {},
	}
}
