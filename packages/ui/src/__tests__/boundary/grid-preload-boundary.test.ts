import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimeFiles } from '../helpers/import-graph'
import { parseImports, resolveSource } from '../helpers/source-imports'
import { docblockEnvironment, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// The `unit` project does not load the grid modules in its setup
// (`setup/grid-modules.ts`, `vitest.config.ts`). Vitest runs each file of a
// project when the import graph of a setup file reaches a changed file, so the
// load in the setup made `test:changed` run each file of `unit` for an edit of
// about half of the source. Thus each file of `unit` whose static imports reach
// a grid loader imports `setup/grid-modules.ts` itself, and no other file does.
// The walk is the walk of Vitest for these files: for an edit of each loader,
// `vitest list --changed` selects the same files of `unit`.

const testsDir = join(srcDir, '__tests__')

const preload = join(testsDir, 'setup', 'grid-modules.ts')

/** The modules that hold a lazy load of the grid, which the preload calls. */
const LOADERS = new Set(
	['grid-data.tsx', 'grid-data-dialogs.tsx', 'grid-region.tsx'].map((file) =>
		join(srcDir, 'modules', 'grid', file),
	),
)

/** The folders of `src/__tests__` that `unit` does not run (`vitest.config.ts`). */
const OTHER_PROJECTS = new Set(['browser', 'compiler', 'docs-build', 'boundary', 'geometry'])

/** The test files of `unit`: each jsdom test file of `src/__tests__` apart from the other projects. */
function unitFiles(): Map<string, string> {
	const files = new Map<string, string>()

	walkSource(
		testsDir,
		(file, content) => {
			if (/\.test\.tsx?$/.test(file) && docblockEnvironment(content) !== 'node') {
				files.set(file, content)
			}
		},
		OTHER_PROJECTS,
	)

	return files
}

/** Whether the static imports of `file` reach a grid loader, apart from the preload. */
function reachesLoader(file: string): boolean {
	const reached = runtimeFiles([file], (next) => next === preload)

	return [...reached].some((next) => LOADERS.has(next))
}

/** Whether `content` of `file` imports the preload. */
function importsPreload(file: string, content: string): boolean {
	return parseImports(content).some(
		({ specifier }) => specifier.startsWith('.') && resolveSource(file, specifier) === preload,
	)
}

// The scan reads each file of `unit` at collection, so the cases read the result.
const files = unitFiles()

const findings = [...files].flatMap(([file, content]) => {
	const reaches = reachesLoader(file)

	const imports = importsPreload(file, content)

	if (reaches && !imports) return [`${srcRelative(file)}: import '…/setup/grid-modules' first`]

	if (!reaches && imports) return [`${srcRelative(file)}: remove the import of setup/grid-modules`]

	return []
})

describe('grid preload boundary', () => {
	it('gives the grid preload to exactly the unit files that reach a grid loader', () => {
		expect(findings).toEqual([])
	})

	it('reads the files of unit, and finds files that reach a loader', () => {
		// The control: the grid suite reaches each loader through the barrel.
		expect(files.size).toBeGreaterThan(400)

		expect(reachesLoader(join(testsDir, 'modules', 'grid.test.tsx'))).toBe(true)

		expect(reachesLoader(join(testsDir, 'hooks', 'use-controllable.test.ts'))).toBe(false)
	})
})
