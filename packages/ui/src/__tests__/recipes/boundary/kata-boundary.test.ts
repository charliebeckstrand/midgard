import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcDir = join(__dirname, '../../..')

const TV_IMPORT = /import\s+\{[^}]*\btv\b[^}]*\}\s+from\s+['"]tailwind-variants['"]/

function isSanctioned(rel: string): boolean {
	if (rel.startsWith('recipes/kata/') && rel.endsWith('.ts')) return true

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
	// Per the audit, `tv()` is the recipe primitive and lives only at the kata
	// public surface (recipes/kata/*.ts) or in layout-local variants files
	// (layouts/*/variants.ts). Importing tv() anywhere else means styling has
	// leaked out of the recipe layer.
	it('tv from tailwind-variants is imported only in sanctioned files', () => {
		const violations: string[] = []

		for (const path of walk(srcDir)) {
			const rel = relative(srcDir, path)

			const source = readFileSync(path, 'utf8')

			if (!TV_IMPORT.test(source)) continue

			/** Locations sanctioned to author `tv()` recipes. */
			if (isSanctioned(rel)) continue

			violations.push(rel)
		}

		expect(violations, `tv() imported outside sanctioned files: ${violations.join(', ')}`).toEqual(
			[],
		)
	})
})
