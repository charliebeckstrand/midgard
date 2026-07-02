import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

const REACT_CREATE_CONTEXT = /import\s+\{[^}]*\bcreateContext\b[^}]*\}\s+from\s+['"]react['"]/

function isSanctioned(rel: string): boolean {
	return rel === 'core/create-context.ts'
}

describe('createContext boundary', () => {
	// All component / primitive / layout contexts must go through the local
	// `core/createContext` helper, which supports required (throws on missing
	// provider) and optional (returns a default) modes. A direct import of
	// `createContext` from React elsewhere bypasses the convention.
	it('createContext from react is imported only in core/create-context.ts', () => {
		const violations: string[] = []

		walkSource(srcDir, (path, source) => {
			if (!/\.tsx?$/.test(path)) return

			const rel = relative(srcDir, path)

			if (!REACT_CREATE_CONTEXT.test(source)) return

			if (isSanctioned(rel)) return

			violations.push(rel)
		})

		expect(
			violations,
			`createContext from 'react' imported outside core/create-context.ts: ${violations.join(', ')}`,
		).toEqual([])
	})
})
