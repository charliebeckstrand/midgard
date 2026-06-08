import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// katakana/ is the bridge layer. A bridge receives kiso token bundles by
// argument and wires them into the recipe surface a kata exports; it must
// not import kiso at all — not even types. Each bridge declares the token
// shape it needs as its own contract and is generic over the bundle passed
// in; concrete axis keys flow through to the kata's variant types.
// A kiso import — value or type — means a token reference is hardcoded in
// the bridge rather than injected by the calling kata.

const katakanaDir = join(__dirname, '../../../recipes/katakana')
const srcDir = join(__dirname, '../../..')

// Captures one module specifier per match — lazy body stops at the first
// `from '…'`, spanning single- or multi-line, value or type imports.
const IMPORT_RE = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g

const KISO_SPECIFIER = /(?:^|\/)kiso(?:\/|$)/

describe('katakana purity boundary', () => {
	it('katakana imports nothing from kiso — not values, not types', () => {
		const violations: string[] = []

		walk(katakanaDir, (file, content) => {
			if (!/\.ts$/.test(file)) return

			// Strip comments before scanning; commented-out imports don't trigger the check.
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

			const rel = relative(srcDir, file)

			for (const match of stripped.matchAll(IMPORT_RE)) {
				const specifier = match[1] ?? ''

				if (KISO_SPECIFIER.test(specifier)) {
					violations.push(`${rel}: imports kiso (${match[0].split('\n')[0]} …)`)
				}
			}
		})

		expect(
			violations,
			`katakana references kiso (declare the token contract in the bridge and inject from the kata instead):\n  ${violations.join('\n  ')}`,
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
