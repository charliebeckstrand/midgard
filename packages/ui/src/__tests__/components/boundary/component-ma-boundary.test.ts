import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// `Ma` is kiso's spacing axis — padding, margin, gap. Layout primitives
// (Box, Flex, Grid, Split) compose it into their `variants.ts` files; that is
// its public role. Every other component derives the same union from its
// kata recipe's `VariantPropsOf`. Importing `Ma` directly anywhere else
// silently crosses the spacing → sizing boundary.

const componentsDir = join(__dirname, '../../../components')

const srcDir = join(__dirname, '../../..')

// `Ma` reaches consumers through the `recipes` barrel (`from '…/recipes'`),
// re-exported from `recipes/kiso/ma.ts`. Match the barrel and any deeper
// path under `recipes/` so a kiso-level deep import can't slip past.
const MA_IMPORT =
	/import\s+(?:type\s+)?\{[^}]*\bMa\b[^}]*\}\s+from\s+['"][^'"]*\/recipes(?:\/[^'"]+)?['"]/

describe('component Ma import boundary', () => {
	it('only variants.ts may import the Ma type from the recipes barrel', () => {
		const violations: string[] = []

		walk(componentsDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			if (basename(file) === 'variants.ts') return

			if (MA_IMPORT.test(content)) {
				violations.push(relative(srcDir, file))
			}
		})

		expect(
			violations,
			`component file imports Ma directly — derive size from the kata's VariantPropsOf instead:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (
			entry.name === '__tests__' ||
			entry.name === '__benchmarks__' ||
			entry.name === 'node_modules' ||
			entry.name === 'dist' ||
			entry.name.startsWith('.')
		) {
			continue
		}

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
