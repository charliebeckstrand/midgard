import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

const RECIPE_IMPORT =
	/import\s+\{[^}]*\bdefineRecipe\b[^}]*\}\s+from\s+['"][^'"]*\bcore\/recipe['"]/

function isSanctioned(rel: string): boolean {
	// Kata that don't match an archetype call `defineRecipe` directly
	// (button, badge, alert, card, …); kata that match an archetype route
	// through their katakana applicator.
	if (rel.startsWith('recipes/kata/') && rel.endsWith('.ts')) return true

	// katakana/ wraps `defineRecipe` on behalf of kata that match an archetype shape.
	if (rel.startsWith('recipes/katakana/') && rel.endsWith('.ts')) return true

	if (/^layouts\/[^/]+\/variants\.ts$/.test(rel)) return true

	return false
}

describe('kata boundary', () => {
	// `defineRecipe` is sanctioned only at the kata surface (recipes/kata/*.ts),
	// the katakana applicator layer (recipes/katakana/*.ts), and layout-local
	// variants files (layouts/*/variants.ts).
	it('defineRecipe from core/recipe is imported only in sanctioned files', () => {
		const violations: string[] = []

		walkSource(srcDir, (path, source) => {
			if (!/\.tsx?$/.test(path)) return

			const rel = relative(srcDir, path)

			if (!RECIPE_IMPORT.test(source)) return

			if (isSanctioned(rel)) return

			violations.push(rel)
		})

		expect(
			violations,
			`defineRecipe imported outside sanctioned files: ${violations.join(', ')}`,
		).toEqual([])
	})
})
