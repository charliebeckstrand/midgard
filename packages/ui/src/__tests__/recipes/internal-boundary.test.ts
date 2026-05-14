import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// `ryu/` is the public substrate scale layer (re-exported from
// src/recipes/index.ts). `kata/` and `waku/` are internal-only — see the
// header in src/recipes/index.ts for the full contract. This test pins the
// three boundaries that keep them internal:
//
//   1. package.json `exports` never lists ./recipes or ./recipes/*.
//   2. The recipes barrel never re-exports anything from kata/ or waku/.
//   3. No app or sibling package imports from 'ui/recipes/*'.

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

	it('src/recipes/index.ts does not re-export from kata/ or waku/', () => {
		const source = readFileSync(join(uiRoot, 'src/recipes/index.ts'), 'utf8')

		const leaks = source.match(/from\s+['"]\.\/(?:kata|waku)\/[^'"]+['"]/g) ?? []

		expect(leaks, `recipes barrel re-exports internals: ${leaks.join(', ')}`).toEqual([])
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

				// Match `from 'ui/recipes...` or `from "ui/recipes...` — the package
				// is consumed as `ui` per its name field, so this catches the only
				// reachable import path. Relative imports across packages aren't
				// possible under the workspace's module-resolution setup.
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
