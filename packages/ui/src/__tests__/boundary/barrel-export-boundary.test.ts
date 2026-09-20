import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// A barrel names what it exports (CONVENTIONS §4.6). `export *` hides the
// surface: it re-exports whatever the module gains next, and the barrel tests
// that read export clauses — `internal-barrel-boundary` among them — cannot see
// through it, so an `@internal` symbol rides out unnoticed.
//
// One statement per source module, too: a module split across a value clause
// and a type clause reads as two dependencies.

// Shipped-source directories. Tests, benchmarks, and the docs engine are
// excluded.
const SCAN_DIRS = [
	'components',
	'core',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'recipes',
	'types',
	'utilities',
]

const STAR = /^export \* from '([^']+)'/gm

const FROM = /^export (?:type )?\{[^}]*\} from '([^']+)'/gms

function eachBarrel(visit: (rel: string, content: string) => void): void {
	for (const dir of SCAN_DIRS) {
		walkSource(join(srcDir, dir), (file, content) => {
			if (!file.endsWith('index.ts')) return

			visit(relative(srcDir, file), content)
		})
	}
}

describe('barrel export boundary', () => {
	it('no barrel re-exports with `export *`', () => {
		const violations: string[] = []

		eachBarrel((rel, content) => {
			for (const match of content.matchAll(STAR)) {
				violations.push(`${rel} → ${match[1]}`)
			}
		})

		expect(
			violations,
			`name each export so the boundary tests can read it:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('each barrel names a source module once', () => {
		const violations: string[] = []

		eachBarrel((rel, content) => {
			const seen = new Set<string>()

			for (const match of content.matchAll(FROM)) {
				const module = match[1] as string

				if (seen.has(module)) {
					violations.push(`${rel} → ${module}`)
				}

				seen.add(module)
			}
		})

		expect(
			violations,
			`merge the clauses; a type rides its module's statement with the inline \`type\` modifier:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
