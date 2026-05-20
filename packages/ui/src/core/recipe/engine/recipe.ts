/**
 * defineRecipe — the recipe primitive.
 *
 * Builds a callable recipe from a `RecipeConfig`:
 *
 *   - `base`, `variants`, `compound`, `defaults` — applied in that order
 *     per call. Class composition runs through `clsx` (conditional input)
 *     and `tailwind-merge` (conflict resolution).
 *   - `slots` — pre-merged once at recipe-creation time and exposed via
 *     the `k` property on the returned recipe.
 *   - `palette` — expanded at creation time into an implicit `color` axis
 *     and a flock of compound rules. See `palette.ts`.
 *
 * The engine adds nothing the call site can't already see in the config:
 * what you write is what the recipe contains. The only implicit move is
 * palette expansion, which is deliberately a top-level field so its
 * presence is obvious.
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

	const slotCache = Object.fromEntries(
		Object.entries(resolved.slots).map(([slot, value]) => [slot, twMerge(clsx(value))]),
	) as { [K in keyof NonNullable<C['slots']>]: string }

	function recipe(props?: ComputedProps<C>): string {
		const values = { ...resolved.defaults, ...(props as Record<string, string | undefined>) }

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

	recipe.k = slotCache

	Object.defineProperty(recipe, 'config', { value: resolved, enumerable: false })

	// `recipe` is a function that we've dynamically extended with `.k` (via
	// assignment) and `.config` (via `defineProperty`). The type system can't
	// see those attachments, so we assert the final shape ourselves.
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
