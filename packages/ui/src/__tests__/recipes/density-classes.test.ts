// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { densityClasses } from '../../core/recipe/engine'
import type { ResolvedConfig } from '../../core/recipe/engine/types'
import { srcDir } from '../helpers/walk-source'

// A recipe with a `densityAxis` builds its density rows at runtime, and
// Tailwind reads only the class literals it finds in source. This test lists
// every density row class of every kata and layout variant, and pins the list in
// `src/recipes/density.generated.txt`, which `ui/tailwind.css` names as a
// source. After a change to a density recipe, run `pnpm density` to write the
// list again.

const kataDir = join(srcDir, 'recipes', 'kata')

const layoutsDir = join(srcDir, 'layouts')

/** Every module that can define a recipe: the kata and the layout variants. */
const recipeModules = [
	...readdirSync(kataDir)
		.filter((name) => name.endsWith('.ts'))
		.map((name) => join(kataDir, name)),
	...readdirSync(layoutsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(layoutsDir, entry.name, 'variants.ts'))
		.filter((path) => existsSync(path)),
].sort()

/** A value that `defineRecipe` returned: callable, with a resolved `config`. */
const isRecipe = (value: unknown): value is { config: ResolvedConfig } =>
	typeof value === 'function' && 'config' in value

/** Collects each recipe in `value`, and in the objects it holds, to `depth` levels. */
function collectRecipes(value: unknown, found: Set<{ config: ResolvedConfig }>, depth = 3): void {
	if (isRecipe(value)) found.add(value)

	if (depth === 0 || value === null || (typeof value !== 'object' && typeof value !== 'function')) {
		return
	}

	for (const child of Object.values(value)) collectRecipes(child, found, depth - 1)
}

describe('density classes', () => {
	it('lists every density row class in density.generated.txt', async () => {
		const recipes = new Set<{ config: ResolvedConfig }>()

		for (const path of recipeModules) collectRecipes(await import(path), recipes)

		const names = new Set([...recipes].flatMap((recipe) => densityClasses(recipe.config)))

		expect(names.size).toBeGreaterThan(0)

		await expect(`${[...names].sort().join('\n')}\n`).toMatchFileSnapshot(
			'../../recipes/density.generated.txt',
		)
	})
})
