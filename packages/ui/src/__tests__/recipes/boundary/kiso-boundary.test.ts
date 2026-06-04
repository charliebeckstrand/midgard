import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// kiso/ holds the design-system tokens — both the primitive atomic concerns
// (iro, ji, ma, sun, sen, omote, hannou, narabi, kasane, tsunagi, ugoki,
// shaku, kokkaku) and the semantic archetype bundles (control, popover,
// segment, panel, slider) composed from them. kiso sits at the bottom of the
// recipe stack and must stay there: kiso modules may compose siblings within
// kiso, but reaching upward into katakana, kata, components, layouts,
// primitives, hooks, or providers would invert the dependency direction
// (kata reads kiso; the reverse creates a cycle) or pull stateful React
// context into the recipe substrate.
//
// The internal consumers of each kiso module are documented per-module in
// recipes/kiso/README.md; pinning that richer contract statically would
// duplicate the README. This test pins the half that is mechanical: kiso has
// no upward dependencies.

const kisoDir = join(__dirname, '../../../recipes/kiso')
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

describe('kiso purity boundary', () => {
	it('kiso does not import from katakana, kata, components, layouts, primitives, hooks, or providers', () => {
		const violations: string[] = []

		walk(kisoDir, (file, content) => {
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
			`kiso reaches upward into higher layers:\n  ${violations.join('\n  ')}`,
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
