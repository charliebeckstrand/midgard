import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Primitives are foundational React/HTML abstractions consumed by components.
// They must not import from components or layouts — doing so inverts the
// dependency direction. Imports from `recipes/kata/` (the recipe funnel) are
// permitted; kata is the curated recipe surface for both components and
// primitives.

const primitivesDir = join(__dirname, '../../../primitives')

const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
] as const

describe('primitive purity boundary', () => {
	it('primitives do not import from components or layouts', () => {
		const violations: string[] = []

		walk(primitivesDir, (file, content) => {
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
			`primitives reach upward into the component / layout layer:\n  ${violations.join('\n  ')}`,
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
