import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// katakana/ is the bridge layer. A bridge receives kiso token bundles by
// argument and wires them into the recipe surface a kata exports; it must
// not import kiso *values*. Type-only imports (`import type { … } from
// '../kiso/…'`) are allowed — they carry the token shape, erase at compile
// time, and create no runtime dependency. A value import from kiso means
// token data leaked into the bridge instead of being injected by the
// calling kata, collapsing the layer the bridge is meant to keep separate.

const katakanaDir = join(__dirname, '../../../recipes/katakana')
const srcDir = join(__dirname, '../../..')

// Captures whether an import statement is `import type` and its module
// specifier. Lazy body stops at the first `from '…'`, so each match spans
// exactly one import — single- or multi-line.
const IMPORT_RE = /import\s+(type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/g

const KISO_SPECIFIER = /(?:^|\/)kiso(?:\/|$)/

describe('katakana purity boundary', () => {
	it('katakana imports no kiso values — only type-only kiso imports are allowed', () => {
		const violations: string[] = []

		walk(katakanaDir, (file, content) => {
			if (!/\.ts$/.test(file)) return

			// Strip comments so commented sample imports don't trigger the scan.
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

			const rel = relative(srcDir, file)

			for (const match of stripped.matchAll(IMPORT_RE)) {
				const isTypeOnly = Boolean(match[1])
				const specifier = match[2] ?? ''

				if (!KISO_SPECIFIER.test(specifier)) continue

				if (!isTypeOnly) {
					violations.push(`${rel}: value import from kiso (${match[0].split('\n')[0]} …)`)
				}
			}
		})

		expect(
			violations,
			`katakana value-imports kiso (inject the tokens from the kata instead):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
