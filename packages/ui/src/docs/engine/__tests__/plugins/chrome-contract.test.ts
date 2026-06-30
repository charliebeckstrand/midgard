import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { moduleNameFor } from '../../plugins/docs'

// `moduleNameFor` maps a file in a library's source root to its derived-code
// module name, or null when the file isn't a public barrel. The derivation
// walker has no allow/deny list: the only thing keeping a docs-internal control
// (VariantListbox, LabeledRow, …) or a demo out of generated snippets is that
// `moduleNameFor` declines to name anything under the `docs/` subtree. These
// pin that contract against a synthetic source root.
const SRC = path.join('/lib', 'src')

const at = (...segs: string[]) => path.join(SRC, ...segs)

describe('chrome contract: the docs subtree is never tagged', () => {
	it('declines files under src/docs/, including index.ts barrels', () => {
		// The consumer's docs entry lives under `src/docs/` — demos and the
		// chrome host. The `docs/` segment, not the filename shape, excludes it.
		expect(moduleNameFor(at('docs', 'demos', 'button.tsx'), SRC)).toBeNull()

		expect(moduleNameFor(at('docs', 'components', 'example.tsx'), SRC)).toBeNull()

		expect(moduleNameFor(at('docs', 'components', 'fake-control', 'index.ts'), SRC)).toBeNull()
	})
})

describe('chrome contract: real public modules are still tagged', () => {
	it('names component, provider, layout, and module index barrels', () => {
		expect(moduleNameFor(at('components', 'button', 'index.ts'), SRC)).toBe('button')

		expect(moduleNameFor(at('providers', 'glass', 'index.ts'), SRC)).toBe('providers/glass')

		expect(moduleNameFor(at('layouts', 'index.ts'), SRC)).toBe('layouts')

		// Modules name flat like components — `ui/grid`, not `ui/modules/grid` —
		// resolved by the package's `./*` export falling through to `src/modules/*`.
		expect(moduleNameFor(at('modules', 'grid', 'index.ts'), SRC)).toBe('grid')
	})

	it('declines non-index files inside a real component directory', () => {
		expect(moduleNameFor(at('components', 'button', 'button.tsx'), SRC)).toBeNull()
	})
})
