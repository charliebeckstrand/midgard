import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vitest/config'
import { splitSequencer } from './src/__tests__/setup/split-sequencer.ts'
import { compileUiSource } from './vitest.compiler.preset.ts'
import base, { docsProject, nodeFiles, smokeFiles } from './vitest.config.ts'

const { version } = createRequire(import.meta.url)('babel-plugin-react-compiler/package.json') as {
	version: string
}

// The React Compiler gate. It runs the `ui` tests with each module compiled, as
// an app with `reactCompiler: true` compiles the `ui` source it imports.
//
// The compiler caches a value on the identity of its inputs. A component that
// reads a mutable object during render, or a bare layout read that the compiler
// removes, passes the plain suite and fails here. `test:compiler` runs this
// config over the `unit`, `docs`, `pure`, and `integration` projects, and CI
// runs it in a job of its own. The `boundary` project reads source, not
// rendered output, so it stays out.
//
// The compiler changes only a component or a hook. A component or a hook runs
// only in a render. In node, a test renders only through `react-dom/server` or
// `react-dom/static`. So a node file with no render runs the same code in the
// two runs, and the `pure` project of this run keeps only the files that
// render (`compiledNodeFiles`). The `geometry` project renders nothing, so it
// stays out.
//
// The `skips` project runs the skip gate in src/__tests__/compiler/, which only
// this run needs.
//
// The compiler reads the `ui` source, not the tests (`vitest.compiler.preset.ts`).
//
// The `docs` project is in a file of its own, so it inherits no plugin of this
// run. Thus this run replaces it with its compiled twin
// (`vitest.docs-compiler.config.ts`). `mergeConfig` joins the two `projects`
// arrays, so the base config goes in with no `docs` entry.
const { projects = [], ...baseTest } = base.test ?? {}

/**
 * The text that marks a node file for the compiled run: a render entry of
 * React, or a read of the flag of the run (`grid-compiler.test.ts`).
 */
const COMPILED_NODE = /['"]react-dom\/(?:server|static)['"]|process\.env\.REACT_COMPILER/

/** The files of the `pure` project that this run keeps. */
const compiledNodeFiles = nodeFiles.filter((file) =>
	COMPILED_NODE.test(readFileSync(join(import.meta.dirname, file), 'utf8')),
)

/** A project of the base config, with the `include` of `pure` narrowed to `compiledNodeFiles`. */
function narrowPure(project: (typeof projects)[number]): (typeof projects)[number] {
	if (typeof project !== 'object' || !('test' in project) || project.test?.name !== 'pure') {
		return project
	}

	return { ...project, test: { ...project.test, include: compiledNodeFiles } }
}

const plain = {
	...base,
	test: {
		...baseTest,
		projects: projects.filter((project) => project !== docsProject).map(narrowPure),
	},
}

export default mergeConfig(plain, {
	plugins: [compileUiSource()],
	test: {
		// `grid-compiler.test.ts` reads this to tell the two runs apart.
		env: { REACT_COMPILER: '1' },
		// The skip gate compiles each module of the source, and it held a large
		// part of the shard that ran it. So each shard runs the gate, and the gate
		// compiles the part of the modules for that shard. This sequencer replaces
		// the sequencer of the base config, so it also deals the page smoke files.
		sequence: { sequencer: splitSequencer(['react-compiler-skips.test.ts'], smokeFiles) },
		// Added to the projects of the base config.
		projects: [
			'./vitest.docs-compiler.config.ts',
			{
				test: {
					name: 'skips',
					environment: 'node',
					pool: 'threads',
					include: ['src/__tests__/compiler/*.test.ts'],
					// Gives the skip gate the shard of the run.
					globalSetup: ['./src/__tests__/setup/shard.ts'],
					// The group of `unit`, so the one long file runs next to that project
					// and not after the last group. As a last group, it ran alone while the
					// other workers waited.
					sequence: { groupOrder: 0 },
					// The file compiles each module, which takes longer than the
					// default limit. Each shard compiles its part of the modules.
					testTimeout: 120_000,
				},
			},
		],
		// A module cache of its own, apart from the plain run's, so a compiled
		// module never reaches the plain run. A warm cache halves this run. The
		// cache keys a file on its source, the plugin names, and the config, not
		// on the compiler's version, so the path carries that version. A
		// compiler upgrade then starts a cold cache, not a stale one.
		fsModuleCachePath: fileURLToPath(
			new URL(`../../node_modules/.vitest-cache-compiler-${version}`, import.meta.url),
		),
	},
})
