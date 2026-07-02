import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// A hook's option / param / result types must not carry a `Use` prefix.
// `Use` reads like a hook name but labels a type; e.g. `TagInputOptions`, not
// `UseTagInputOptions`. Matches only `type` / `interface` declarations whose
// name begins with `Use` + an uppercase letter (`User`, `Usage`, etc. are fine).

const srcDir = join(__dirname, '../..')

// Shipped-source directories. Tests, benchmarks, generated docs, and build
// output are excluded.
const SCAN_DIRS = ['components', 'hooks', 'primitives', 'core', 'providers', 'layouts']

const USE_PREFIXED_TYPE = /\b(?:type|interface)\s+(Use[A-Z]\w*)/g

describe('hook type-name prefix boundary', () => {
	it('no type or interface name is prefixed with `Use`', () => {
		const violations: string[] = []

		for (const dir of SCAN_DIRS) {
			walk(join(srcDir, dir), (file, content) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

				for (const match of content.matchAll(USE_PREFIXED_TYPE)) {
					violations.push(`${relative(srcDir, file)} → ${match[1]}`)
				}
			})
		}

		expect(
			violations,
			`type/interface names must not use a \`Use\` prefix — drop it (e.g. UseFooOptions → FooOptions):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (
			entry.name === '__tests__' ||
			entry.name === '__benchmarks__' ||
			entry.name === 'node_modules' ||
			entry.name === 'dist' ||
			entry.name.startsWith('.')
		) {
			continue
		}

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
