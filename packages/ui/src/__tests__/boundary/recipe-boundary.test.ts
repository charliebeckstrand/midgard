import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `kata/`, `katakana/`, and `kiso/` are internal-only; see the header in
// src/recipes/index.ts for the full contract. This test pins four boundaries:
//
//   1. package.json `exports` never lists ./recipes or ./recipes/*.
//   2. The recipes barrel never re-exports anything from kata/, katakana/,
//      or kiso/ value bindings; only type re-exports flow through it.
//   3. The recipes barrel surfaces types only (no value `export` statements).
//   4. No app or sibling package imports from 'ui/recipes/*'.

const uiRoot = join(__dirname, '../../..')

const workspaceRoot = join(uiRoot, '../..')

describe('recipes internal-boundary contract', () => {
	it('package.json exports does not surface ./recipes', () => {
		const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8')) as {
			exports: Record<string, unknown>
		}

		const leaks = Object.keys(pkg.exports).filter(
			(key) => key === './recipes' || key.startsWith('./recipes/'),
		)

		expect(leaks, `package.json exports leaks recipes: ${leaks.join(', ')}`).toEqual([])
	})

	it('src/recipes/index.ts does not re-export from kata/ or katakana/', () => {
		const source = readFileSync(join(uiRoot, 'src/recipes/index.ts'), 'utf8')

		const leaks = source.match(/from\s+['"]\.\/(?:kata|katakana)\/[^'"]+['"]/g) ?? []

		expect(leaks, `recipes barrel re-exports internals: ${leaks.join(', ')}`).toEqual([])
	})

	it('src/recipes/index.ts is types-only: no value exports', () => {
		const source = readFileSync(join(uiRoot, 'src/recipes/index.ts'), 'utf8')

		// Strip block comments (the JSDoc header may contain code-like snippets)
		// before scanning for value exports.
		const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '')

		// Every `export` must carry the `type` keyword (`export type {…}` or
		// `export { type X, type Y }`); bare `export {…}` or `export *` leaks
		// runtime values through the barrel.
		const violations: string[] = []

		for (const line of stripped.split('\n')) {
			const trimmed = line.trim()

			if (!trimmed.startsWith('export')) continue

			if (/^export\s+type\s+/.test(trimmed)) continue

			if (/^export\s+\{[^}]*\}/.test(trimmed)) {
				const inner = trimmed.match(/\{([^}]*)\}/)?.[1] ?? ''

				const allTyped = inner
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.every((s) => s.startsWith('type '))

				if (allTyped) continue
			}

			violations.push(trimmed)
		}

		expect(
			violations,
			`recipes barrel leaks runtime values:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no app or sibling package imports from ui/recipes/*', () => {
		const scanRoots = [
			join(workspaceRoot, 'apps'),
			...readdirSync(join(workspaceRoot, 'packages'), { withFileTypes: true })
				.filter((entry) => entry.isDirectory() && entry.name !== 'ui')
				.map((entry) => join(workspaceRoot, 'packages', entry.name)),
		]

		const offenders: string[] = []

		for (const root of scanRoots) {
			try {
				statSync(root)
			} catch {
				continue
			}

			walk(root, (file, content) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

				// Matches `from 'ui/recipes...'` / `from "ui/recipes..."`, the only
				// reachable import path under the workspace's module-resolution setup.
				if (/from\s+['"]ui\/recipes(?:\/|['"])/.test(content)) {
					offenders.push(file.slice(workspaceRoot.length + 1))
				}
			})
		}

		expect(offenders, `external imports of ui/recipes: ${offenders.join(', ')}`).toEqual([])
	})
})

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
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
