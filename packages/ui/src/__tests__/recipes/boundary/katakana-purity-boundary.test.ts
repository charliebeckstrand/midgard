import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// katakana/ is recipe-engine wiring. Every fragment it composes must reach
// kiso by name — no literal Tailwind class strings live in a katakana file.
// Detection: scan every single-/double-quoted string literal; flag anything
// shaped like a Tailwind utility. A utility is either a hyphenated lowercase
// token (the `bg-white`, `rounded-lg`, `inline-flex`, `flex-1` shape) or one
// of the bare single-word utilities the library actually uses.

const katakanaDir = join(__dirname, '../../../recipes/katakana')
const srcDir = join(__dirname, '../../..')

const TAILWIND_LIKE =
	/\b(?:[a-z][a-z0-9]*-[a-z0-9]|relative|absolute|fixed|sticky|flex|grid|block|hidden|truncate|isolate)\b/

describe('katakana purity boundary', () => {
	it('katakana files contain no literal Tailwind class strings', () => {
		const violations: string[] = []

		walk(katakanaDir, (file, content) => {
			if (!/\.ts$/.test(file)) return

			// Strip comments so JSDoc and inline comments don't trigger the scan.
			const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

			const rel = relative(srcDir, file)

			for (const match of stripped.matchAll(
				/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g,
			)) {
				const value = match[1] ?? match[2] ?? ''

				if (!value) continue

				// Module paths and identifier-shaped values are safe.
				if (value.startsWith('./') || value.startsWith('../')) continue

				if (TAILWIND_LIKE.test(value)) {
					violations.push(`${rel}: literal ${match[0]}`)
				}
			}
		})

		expect(
			violations,
			`katakana files contain literal Tailwind class strings (promote each to a named kiso recipe):\n  ${violations.join('\n  ')}`,
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
