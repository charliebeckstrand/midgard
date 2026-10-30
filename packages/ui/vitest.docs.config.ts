import { configDefaults, defineConfig } from 'vitest/config'
import { docsTestDir, srcRelative } from './src/__tests__/helpers/walk-source.ts'
import { reactDocs } from './src/docs/plugin/index.ts'
import { sequence } from './vitest.base.ts'
import {
	cachePlugins,
	docsGroupOrder,
	nodeFiles,
	projectDefaults,
	unitSetupFiles,
} from './vitest.config.ts'

/**
 * The `docs` project: the jsdom suites of the docs app, under
 * `src/docs/__tests__`. The files with the node docblock run in `pure`.
 *
 * @remarks
 * The pages import the virtual modules of the docs plugin, so this project
 * loads the plugin. The smoke test of the pages (`page-smoke.test.tsx`) needs
 * the real plugin.
 *
 * The plugin is in this file, not in `vitest.config.ts`. Vitest keys each
 * entry of its module cache on the text of each file that the config imports.
 * When a file of the plugin changes, or a `ui` module that the plugin imports,
 * each entry of that config misses. `--changed` and `related` then select each
 * test file of that config. In `vitest.config.ts`, that was each file of each
 * project. A project in a file of its own has its own config files, so such a
 * change reaches only this project.
 *
 * A project in a file of its own inherits no option of the root config, so this
 * file spreads `projectDefaults`. The other settings are the settings of the
 * `unit` project: one module registry and one jsdom window for each worker.
 * `vitest.docs-compiler.config.ts` adds the React Compiler for the compiled run.
 */
export default defineConfig({
	plugins: [...cachePlugins, reactDocs()],
	test: {
		...projectDefaults,
		name: 'docs',
		setupFiles: unitSetupFiles,
		pool: 'threads',
		// As in the `unit` project. `test-isolation-boundary.test.ts` reads this line.
		isolate: false,
		include: [`src/${srcRelative(docsTestDir)}/**/*.test.{ts,tsx}`],
		exclude: [...configDefaults.exclude, ...nodeFiles],
		sequence: { ...sequence, groupOrder: docsGroupOrder },
	},
})
