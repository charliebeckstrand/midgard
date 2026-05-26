import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Top-level hooks are reusable building blocks consumed by components,
// primitives, and other hooks. They must not reach upward into components,
// layouts, providers, or recipe-layer internals (kata / katakana / genkei).
// Importing primitives is allowed — hooks frequently read context exposed
// through primitive providers (see useRipple → ReducedMotion).

const hooksDir = join(__dirname, '../../../hooks')
const srcDir = join(__dirname, '../../..')

const FORBIDDEN_PATTERNS = [
	{ label: 'components/', regex: /from\s+['"][^'"]*\/components\/[^'"]+['"]/g },
	{ label: 'layouts/', regex: /from\s+['"][^'"]*\/layouts\/[^'"]+['"]/g },
	{ label: 'providers/', regex: /from\s+['"][^'"]*\/providers\/[^'"]+['"]/g },
	{ label: 'recipes/kata/', regex: /from\s+['"][^'"]*\/recipes\/kata\/[^'"]+['"]/g },
	{ label: 'recipes/katakana/', regex: /from\s+['"][^'"]*\/recipes\/katakana\/[^'"]+['"]/g },
	{ label: 'recipes/genkei/', regex: /from\s+['"][^'"]*\/recipes\/genkei\/[^'"]+['"]/g },
] as const

describe('hook purity boundary', () => {
	it('top-level hooks do not import from components, layouts, providers, or recipe-layer internals', () => {
		const violations: string[] = []

		walk(hooksDir, (file, content) => {
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
			`top-level hooks reach upward into higher layers:\n  ${violations.join('\n  ')}`,
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
