import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseImports, resolveSource } from '../helpers/source-imports'
import { stripSourceComments, uiRoot, workspaceRoot } from '../helpers/walk-source'

// Vitest keys each entry of its module cache on the text of each file that the
// config imports. When one of those files changes, each entry of the config
// misses, and `--changed` and `related` select each test file of the config.
// The docs plugin and the `ui` modules that it imports were in the graph of
// `vitest.config.ts` once. Then an edit to `code-shiki.ts` made the whole cache
// miss, and `test:changed` ran 757 files, not 48. The plugin now loads in
// `vitest.docs.config.ts`, the config of the `docs` project, and this gate keeps
// the root configs to the test harness.
//
// The CI cache keys hash the same files (`.github/workflows/ci.yml`). Thus a
// change to one of them starts a new cache, and a change to another file keeps
// the cache. This gate holds each key to the graph of its config.

/** The root configs, and the prefix of the CI cache key of each. */
const ROOTS = [
	{ config: 'vitest.config.ts', key: 'vitest-cache-' },
	{ config: 'vitest.compiler.config.ts', key: 'vitest-compiler-cache-' },
] as const

const srcRoot = join(uiRoot, 'src')

const harnessRoot = join(srcRoot, '__tests__')

// A bare import or a dynamic import has no `from`, so `parseImports` does not
// read it. Vite puts each of them in the graph of the config too.
const BARE_IMPORT = /^import\s+['"]([^'"]+)['"]/gm

const DYNAMIC_IMPORT = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g

/** The runtime specifiers of a file: the `from` imports and the two forms above. */
function specifiers(content: string): string[] {
	const code = stripSourceComments(content)

	return [
		...parseImports(code)
			.filter((ref) => ref.runtime)
			.map((ref) => ref.specifier),
		...[...code.matchAll(BARE_IMPORT), ...code.matchAll(DYNAMIC_IMPORT)].map(
			(match) => match[1] as string,
		),
	]
}

type Graph = { files: string[]; selfImports: string[] }

/**
 * The local files that a config imports, with the config, as paths from the
 * repository root. A package in `node_modules` is not in it, because Vite
 * leaves a package out of the config bundle. `ui` is not in `node_modules`, so
 * an import of `ui` or of `ui/*` goes to `selfImports`.
 */
function configGraph(config: string): Graph {
	const files = new Set<string>()

	const selfImports: string[] = []

	const queue = [join(uiRoot, config)]

	for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
		if (files.has(file)) continue

		files.add(file)

		for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
			if (/^ui(?:\/|$)/.test(specifier)) {
				selfImports.push(`${relative(workspaceRoot, file)} → ${specifier}`)

				continue
			}

			if (!specifier.startsWith('.')) continue

			// `resolveSource` adds the extension, and a config names it.
			const target = resolveSource(file, specifier.replace(/\.tsx?$/, ''))

			if (!target) throw new Error(`${relative(workspaceRoot, file)}: no file for ${specifier}`)

			queue.push(target)
		}
	}

	return { files: [...files].map((file) => relative(workspaceRoot, file)).sort(), selfImports }
}

/** The arguments of `hashFiles` on each line of `ci.yml` that names the key. */
function keyHashes(workflow: string, key: string): string[][] {
	return workflow
		.split('\n')
		.filter((line) => line.includes(`-${key}`))
		.map((line) =>
			[...(line.match(/hashFiles\(([^)]*)\)/)?.[1] ?? '').matchAll(/'([^']+)'/g)]
				.map((match) => match[1] as string)
				.sort(),
		)
}

describe('vitest config', () => {
	// The parse runs at collection, under no budget, and each case asserts on
	// its result (`nodeScan` in `vitest.config.ts`).
	const graphs = ROOTS.map((root) => ({ ...root, ...configGraph(root.config) }))

	const workflow = readFileSync(join(workspaceRoot, '.github', 'workflows', 'ci.yml'), 'utf8')

	it('keeps the ui source out of each root config', () => {
		const source = graphs.flatMap(({ config, files, selfImports }) => [
			...files
				.filter((file) => {
					const path = join(workspaceRoot, file)

					return path.startsWith(srcRoot) && !path.startsWith(harnessRoot)
				})
				.map((file) => `${config} → ${file}`),
			...selfImports,
		])

		expect(
			source,
			'a root config imports ui source, so each edit to it empties the module cache and makes `--changed` run each test file. Load it in the config of the project that needs it, as `vitest.docs.config.ts` loads the docs plugin',
		).toEqual([])
	})

	it.each(ROOTS)('hashes the graph of $config in the CI cache key', ({ config, key }) => {
		const graph = graphs.find((entry) => entry.config === config)?.files

		const hashes = keyHashes(workflow, key)

		expect(hashes, `ci.yml has no key line and no restore line for ${key}`).toHaveLength(2)

		for (const hash of hashes) {
			expect(
				hash,
				`the hashFiles of the ${key} key in ci.yml must list exactly the files that ${config} imports`,
			).toEqual(graph)
		}
	})
})
