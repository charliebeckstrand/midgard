import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcDir = join(__dirname, '../../..')

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

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry)

		const stat = statSync(path)

		if (stat.isDirectory()) {
			if (entry === '__tests__' || entry === 'node_modules') continue

			yield* walk(path)
		} else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
			yield path
		}
	}
}

describe('kata boundary', () => {
	// `defineRecipe` is sanctioned only at the kata surface (recipes/kata/*.ts),
	// the katakana applicator layer (recipes/katakana/*.ts), and layout-local
	// variants files (layouts/*/variants.ts).
	it('defineRecipe from core/recipe is imported only in sanctioned files', () => {
		const violations: string[] = []

		for (const path of walk(srcDir)) {
			const rel = relative(srcDir, path)

			const source = readFileSync(path, 'utf8')

			if (!RECIPE_IMPORT.test(source)) continue

			if (isSanctioned(rel)) continue

			violations.push(rel)
		}

		expect(
			violations,
			`defineRecipe imported outside sanctioned files: ${violations.join(', ')}`,
		).toEqual([])
	})
})
