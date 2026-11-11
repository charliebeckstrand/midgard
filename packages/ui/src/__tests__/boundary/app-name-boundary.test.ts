import { basename, dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRepeatedNames } from '../helpers/name-scope'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// App name boundary (CONVENTIONS.md §8.2 and §8.4). The names of the apps and
// of the other packages follow the rules that ui follows. This gate reads the
// files outside ui, so it runs in the `workspace` project.
//
//   1. A file-private function does not repeat two words of its file name
//      (`findRepeatedNames`, as `name-scope-boundary.test.ts` does in ui).
//   2. A file in the `utilities` folder of an app does not repeat the name of
//      the app. The folder already tells the app, so `places-url.ts` is `url.ts`.
//   3. A `<feature>-queries.ts` file has a `<feature>-api.ts` file with the same
//      stem, in its folder or in the `api` folder beside it. The query hooks of
//      a feature wrap the requests of that feature (CONVENTIONS.md §6.4).

const APPS = ['admin', 'elections', 'picks', 'places']

const SCAN_ROOTS = [
	...APPS.map((app) => join(workspaceRoot, 'apps', app)),
	join(workspaceRoot, 'packages', 'auth'),
	join(workspaceRoot, 'packages', 'shared'),
]

const QUERIES_FILE = /^([a-z0-9-]+)-queries\.tsx?$/

describe('app name boundary', () => {
	const files = workspaceSources(SCAN_ROOTS)

	it('reads the source of each app and package', () => {
		expect(files.size).toBeGreaterThan(0)
	})

	it('a file-private function does not repeat two words of its file name', () => {
		const violations = [...files]
			.filter(([file]) => !file.endsWith('.d.ts'))
			.flatMap(([file, content]) =>
				findRepeatedNames(file, content).map((name) => `${file}: ${name}`),
			)

		expect(violations).toEqual([])
	})

	it('a utilities file does not repeat the name of its app', () => {
		const violations = [...files.keys()].filter((file) => {
			const app = /^apps\/([^/]+)\/src\/utilities\//.exec(file)?.[1]

			return app !== undefined && basename(file).startsWith(`${app}-`)
		})

		expect(violations).toEqual([])
	})

	it('a queries file has an api file with the same stem', () => {
		const violations = [...files.keys()].filter((file) => {
			const stem = QUERIES_FILE.exec(basename(file))?.[1]

			if (stem === undefined) return false

			const folder = dirname(file)

			return ![folder, join(dirname(folder), 'api')].some((dir) =>
				files.has(`${dir}/${stem}-api.ts`),
			)
		})

		expect(violations).toEqual([])
	})
})
