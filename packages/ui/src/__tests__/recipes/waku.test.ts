import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const wakuDir = join(__dirname, '../../recipes/waku')

const wakuFiles = readdirSync(wakuDir).filter((f) => f.endsWith('.ts'))

describe('waku wire-format contract', () => {
	// Per packages/ui/src/recipes/waku/README.md, every waku export is a class
	// fragment (`string[]`) or a map of fragments. `defineRecipe()` is invoked only at
	// the kata public surface so callers keep one wire format and recipes
	// preserve `VariantProps<typeof X>` inference via passthrough generics.
	it.each(wakuFiles)('%s does not import tv from tailwind-variants', (file) => {
		const source = readFileSync(join(wakuDir, file), 'utf8')

		const hasTvImport = /import\s+\{[^}]*\btv\b[^}]*\}\s+from\s+['"]tailwind-variants['"]/.test(
			source,
		)

		expect(hasTvImport, `${file} imports tv from tailwind-variants`).toBe(false)
	})
})
