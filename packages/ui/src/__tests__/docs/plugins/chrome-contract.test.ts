import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { moduleNameFor } from '../../../docs/plugins/docs'

// src/__tests__/docs/plugins -> src
const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const DOCS_COMPONENTS = path.join(SRC_DIR, 'docs', 'components')

/**
 * The docs code-derivation walker filters its own UI controls out of generated
 * snippets by their not being tagged with __module/__name at build time
 * (INV-UNWRAP-UNKNOWN). There is no allow/deny list; the only thing keeping a
 * docs-internal control (VariantListbox, LabeledRow, ...) out of every code
 * block is that the docs plugin's `moduleNameFor` declines to name it. This
 * suite pins that contract.
 */
describe('chrome contract: docs-internal controls are never tagged', () => {
	it('declines every real file under src/docs/components/', () => {
		const files = fs
			.readdirSync(DOCS_COMPONENTS, { recursive: true, withFileTypes: true })
			.filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
			.map((e) => path.join(e.parentPath, e.name))

		// Guard: if the glob ever resolves empty, the assertions below are vacuous.
		expect(files.length).toBeGreaterThan(5)

		for (const file of files) {
			expect(
				moduleNameFor(file, SRC_DIR),
				`${path.relative(SRC_DIR, file)} must not be tagged`,
			).toBe(null)
		}
	})

	it('declines an index.ts even if one were nested under src/docs/components/', () => {
		// The `docs/` segment, not the filename shape, protects controls; a
		// control authored as `<name>/index.ts` is still excluded.
		expect(moduleNameFor(path.join(DOCS_COMPONENTS, 'fake-control', 'index.ts'), SRC_DIR)).toBe(
			null,
		)
	})
})

describe('chrome contract: real public modules are still tagged', () => {
	it('names component, provider, and layout index barrels', () => {
		expect(moduleNameFor(path.join(SRC_DIR, 'components', 'button', 'index.ts'), SRC_DIR)).toBe(
			'button',
		)

		expect(moduleNameFor(path.join(SRC_DIR, 'providers', 'glass', 'index.ts'), SRC_DIR)).toBe(
			'providers/glass',
		)

		expect(moduleNameFor(path.join(SRC_DIR, 'layouts', 'index.ts'), SRC_DIR)).toBe('layouts')
	})

	it('declines non-index files inside a real component directory', () => {
		expect(moduleNameFor(path.join(SRC_DIR, 'components', 'button', 'button.tsx'), SRC_DIR)).toBe(
			null,
		)
	})
})
