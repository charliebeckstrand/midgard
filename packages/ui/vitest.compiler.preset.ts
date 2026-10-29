import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'

/** The folder of each harness under `src`, as a path segment. */
const HARNESS = {
	__tests__: /[\\/]__tests__[\\/]/,
	__benchmarks__: /[\\/]__benchmarks__[\\/]/,
}

/**
 * The docs site, `src/docs`. An app does not import it, and the skip gate
 * leaves it out for the same reason. The site compiles with its own preset
 * ({@link compileDocs}).
 */
const DOCS = /[\\/]src[\\/]docs[\\/]/

/** The dependencies. An app compiles only its own source and the `ui` source. */
const NODE_MODULES = /[\\/]node_modules[\\/]/

/** A virtual module, such as the data of `virtual:docs/pages`. Its id starts with a null byte. */
const VIRTUAL = /^\0/

/**
 * The React Compiler through the plugin of Babel, for each module that
 * `exclude` does not name and that is not in `node_modules`.
 */
function compile(exclude: readonly RegExp[]) {
	return babel({
		presets: [
			{
				preset: () => ({ plugins: [[reactCompiler, {}]] }),
				rolldown: {
					filter: {
						id: { exclude: [...exclude, NODE_MODULES] },
						// A module with no capitalized name and no `use` call holds no
						// component or hook, so Babel skips it.
						code: /\b[A-Z]|\buse/,
					},
				},
			},
		],
	})
}

/**
 * The React Compiler over the `ui` source, for the compiled test run
 * (`vitest.compiler.config.ts`) and the compiled bench run
 * (`vitest.bench.browser.compiler.config.ts`). An app with `reactCompiler: true`
 * compiles the `ui` source that it imports, and each run compiles it the same
 * way.
 *
 * The compiler reads the `ui` source only. The harness of the run, the tests or
 * the benchmarks, stays plain, and so do the docs site and the dependencies in
 * `node_modules`. So the plain run and the compiled run of one suite differ
 * only in the `ui` source.
 *
 * The preset is written out rather than taken from `reactCompilerPreset`. That
 * helper applies only to the client environment, and the `pure` project runs in
 * node.
 *
 * @param harness - The folder of the harness under `src`: `__tests__` or
 * `__benchmarks__`.
 */
export function compileUiSource(harness: keyof typeof HARNESS) {
	return compile([HARNESS[harness], DOCS])
}

/**
 * The React Compiler over the docs site and the `ui` source that it imports,
 * for `vite.config.ts` of the docs. The site builds as an app with
 * `reactCompiler: true` does. The dependencies in `node_modules` and the
 * virtual modules of the docs plugin stay plain.
 *
 * Put the preset after the docs plugin (`reactDocs`). Both plugins have
 * `enforce: 'pre'`, so they run in the order of the list. The docs plugin reads
 * the JSX and the default export of each page as the source writes them. The
 * compiler rewrites each component, so the docs plugin must read the module
 * first.
 */
export function compileDocs() {
	return compile([VIRTUAL])
}
