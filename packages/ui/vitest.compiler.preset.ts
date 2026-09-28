import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'

/**
 * The React Compiler over the `ui` source, for the compiled test run
 * (`vitest.compiler.config.ts`) and the compiled bench run
 * (`vitest.bench.browser.compiler.config.ts`). An app with `reactCompiler: true`
 * compiles the `ui` source that it imports, and each run compiles it the same
 * way.
 *
 * The compiler reads the `ui` source only. The harness of the run, the tests or
 * the benchmarks, stays plain, and so do the dependencies in `node_modules`. So
 * the plain run and the compiled run of one suite differ only in the `ui`
 * source.
 *
 * The preset is written out rather than taken from `reactCompilerPreset`. That
 * helper applies only to the client environment, and the `pure` project runs in
 * node.
 *
 * @param harness - The folder of the harness under `src`: `__tests__` or
 * `__benchmarks__`.
 */
export function compileUiSource(harness: '__tests__' | '__benchmarks__') {
	return babel({
		presets: [
			{
				preset: () => ({ plugins: [[reactCompiler, {}]] }),
				rolldown: {
					filter: {
						id: { exclude: [new RegExp(`[\\\\/]${harness}[\\\\/]`), /[\\/]node_modules[\\/]/] },
						// A module with no capitalized name and no `use` call holds no
						// component or hook, so Babel skips it.
						code: /\b[A-Z]|\buse/,
					},
				},
			},
		],
	})
}
