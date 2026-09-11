import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The `pure` project's file set: every `*.test.ts` under these directories,
 * minus the DOM exceptions below. `vitest.config.ts` includes exactly this
 * list in `pure` and excludes it from `unit`, so a file runs in one project
 * and never in both; `pure-project-boundary.test.ts` holds the list to its
 * meaning in both directions.
 *
 * Node-only (`node:fs`): import it from the config and the boundary test, and
 * keep it off the `helpers` barrel.
 */
export const PURE_DIRS = ['utilities', 'recipes', 'core'] as const

/**
 * Files under {@link PURE_DIRS} that read `document` or `window` and so stay
 * in the jsdom `unit` project. A `*.test.tsx` file needs no entry: the pure
 * glob is `*.test.ts`, and a DOM test in these directories that renders is a
 * `.tsx` file already.
 */
export const DOM_EXCEPTIONS: ReadonlySet<string> = new Set([
	'core/accessible-name.test.ts',
	'core/announcer.test.ts',
	'core/query-slot.test.ts',
	'utilities/document-listener.test.ts',
])

/**
 * Lists the pure test files as paths relative to the package root, in
 * directory order, so a config that spreads them stays stable across runs.
 *
 * @param packageRoot - Absolute path of `packages/ui`.
 */
export function pureTestFiles(packageRoot: string): string[] {
	const files: string[] = []

	for (const dir of PURE_DIRS) {
		for (const name of readdirSync(join(packageRoot, 'src', '__tests__', dir)).sort()) {
			if (!name.endsWith('.test.ts') || DOM_EXCEPTIONS.has(`${dir}/${name}`)) continue

			files.push(`src/__tests__/${dir}/${name}`)
		}
	}

	return files
}
