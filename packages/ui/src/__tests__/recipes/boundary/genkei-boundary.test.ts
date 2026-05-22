import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// genkei/ holds the raw class-fragment data each archetype shares — control,
// popover, segment, slider. It sits below the applicator surface and must
// stay there: genkei may compose kiso and other genkei, but a genkei module
// reaching up into katakana, components, layouts, primitives, hooks, or
// providers would invert the dependency direction (katakana applicators
// import from genkei; the reverse creates a cycle) or pull stateful React
// context into the recipe layer.
//
// The internal consumers of each genkei module are documented per-module in
// recipes/genkei/README.md; pinning that richer contract statically would
// duplicate the README. This test pins the half that is mechanical: genkei
// has no upward dependencies.

const genkeiDir = join(__dirname, '../../../recipes/genkei')
const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'recipes/katakana/', regex: /from\s+['"][^'"]*\/recipes\/katakana\/[^'"]+['"]/g },
	{ label: 'recipes/kata/', regex: /from\s+['"][^'"]*\/recipes\/kata\/[^'"]+['"]/g },
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
	{ label: 'primitives/', regex: /from\s+['"][^'"]*\/primitives\/[^'"]+['"]/g },
	{ label: 'hooks/', regex: /from\s+['"][^'"]*\/hooks\/[^'"]+['"]/g },
	{ label: 'providers/', regex: /from\s+['"][^'"]*\/providers\/[^'"]+['"]/g },
] as const

describe('genkei purity boundary', () => {
	it('genkei does not import from katakana, kata, components, layouts, primitives, hooks, or providers', () => {
		const violations: string[] = []

		walk(genkeiDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			const rel = relative(srcDir, file)

			for (const { label, regex } of FORBIDDEN_PATTERNS) {
				for (const match of content.matchAll(regex)) {
					violations.push(`${rel} → ${label} (${match[0]})`)
				}
			}
		})

		expect(
			violations,
			`genkei reaches upward into higher layers:\n  ${violations.join('\n  ')}`,
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
