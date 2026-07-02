import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const srcDir = join(__dirname, '../..')

const REACT_CREATE_CONTEXT = /import\s+\{[^}]*\bcreateContext\b[^}]*\}\s+from\s+['"]react['"]/

function isSanctioned(rel: string): boolean {
	return rel === 'core/create-context.ts'
}

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry)

		const stat = statSync(path)

		if (stat.isDirectory()) {
			if (entry === '__tests__' || entry === 'node_modules') continue

			yield* walk(path)
		} else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
			yield path
		}
	}
}

describe('createContext boundary', () => {
	// All component / primitive / layout contexts must go through the local
	// `core/createContext` helper, which supports required (throws on missing
	// provider) and optional (returns a default) modes. A direct import of
	// `createContext` from React elsewhere bypasses the convention.
	it('createContext from react is imported only in core/create-context.ts', () => {
		const violations: string[] = []

		for (const path of walk(srcDir)) {
			const rel = relative(srcDir, path)

			const source = readFileSync(path, 'utf8')

			if (!REACT_CREATE_CONTEXT.test(source)) continue

			if (isSanctioned(rel)) continue

			violations.push(rel)
		}

		expect(
			violations,
			`createContext from 'react' imported outside core/create-context.ts: ${violations.join(', ')}`,
		).toEqual([])
	})
})
