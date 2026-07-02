import { basename, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// `Ma` is kiso's spacing axis: padding, margin, gap. Layout primitives
// (Box, Flex, Grid, Split) compose it into their `variants.ts` files; that is
// its public role. Every other component derives the same union from its
// kata recipe's `VariantProps`. Importing `Ma` directly anywhere else
// silently crosses the spacing → sizing boundary.

const componentsDir = join(srcDir, 'components')

// `Ma` reaches consumers through the `recipes` barrel (`from '…/recipes'`),
// re-exported from `recipes/kiso/ma.ts`. Match the barrel and any deeper
// path under `recipes/` so a kiso-level deep import can't slip past.
const MA_IMPORT =
	/import\s+(?:type\s+)?\{[^}]*\bMa\b[^}]*\}\s+from\s+['"][^'"]*\/recipes(?:\/[^'"]+)?['"]/

describe('component Ma import boundary', () => {
	it('only variants.ts may import the Ma type from the recipes barrel', () => {
		const violations: string[] = []

		walkSource(componentsDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			if (basename(file) === 'variants.ts') return

			if (MA_IMPORT.test(content)) {
				violations.push(relative(srcDir, file))
			}
		})

		expect(
			violations,
			`component file imports Ma directly — derive size from the kata's VariantProps instead:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
