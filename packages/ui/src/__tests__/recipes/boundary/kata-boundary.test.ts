import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcDir = join(__dirname, '../../..')

const RECIPE_IMPORT =
	/import\s+\{[^}]*\bdefineRecipe\b[^}]*\}\s+from\s+['"][^'"]*\bcore\/recipe['"]/

function isSanctioned(rel: string): boolean {
	if (rel.startsWith('recipes/kata/') && rel.endsWith('.ts')) return true

	// katakana/ is the applicator layer — it calls defineRecipe on behalf of
	// kata. Mock-phase sanctioning; once every kata routes through katakana,
	// `recipes/kata/` comes off this list and only katakana retains access.
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
	// `defineRecipe` is the recipe primitive and lives only at the kata public
	// surface (recipes/kata/*.ts) or in layout-local variants files
	// (layouts/*/variants.ts). Importing it anywhere else means styling has
	// leaked out of the recipe layer.
	it('defineRecipe from core/recipe is imported only in sanctioned files', () => {
		const violations: string[] = []

		for (const path of walk(srcDir)) {
			const rel = relative(srcDir, path)

			const source = readFileSync(path, 'utf8')

			if (!RECIPE_IMPORT.test(source)) continue

			/** Locations sanctioned to author recipes. */
			if (isSanctioned(rel)) continue

			violations.push(rel)
		}

		expect(
			violations,
			`defineRecipe imported outside sanctioned files: ${violations.join(', ')}`,
		).toEqual([])
	})
})
