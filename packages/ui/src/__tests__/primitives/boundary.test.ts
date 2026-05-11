import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const primitivesDir = join(__dirname, '../../primitives')

const COMPONENTS_IMPORT = /from\s+['"][^'"]*\.\.\/components\/[^'"]+['"]/

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry)

		const stat = statSync(path)

		if (stat.isDirectory()) {
			yield* walk(path)
		} else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
			yield path
		}
	}
}

describe('primitives boundary', () => {
	// Per CLAUDE.md, dependencies flow inward — primitives are the inner ring,
	// so they cannot import from components. A primitive that needs ambient
	// state takes it as a prop; a primitive that needs to render something
	// component-like accepts it as ReactNode.
	it.each([...walk(primitivesDir)])('%s does not import from components/', (path) => {
		const source = readFileSync(path, 'utf8')

		expect(
			COMPONENTS_IMPORT.test(source),
			`${relative(primitivesDir, path)} imports from components/`,
		).toBe(false)
	})
})
