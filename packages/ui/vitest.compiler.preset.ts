import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'

/** The test harness, `src/__tests__`, as a path segment. */
const HARNESS = /[\\/]__tests__[\\/]/

/**
 * The docs site, `src/docs`. An app does not import it, and the skip gate
 * leaves it out for the same reason. The site builds with the plain React
 * plugin.
 */
const DOCS = /[\\/]src[\\/]docs[\\/]/

/**
 * The React Compiler over the `ui` source, for the compiled test run
 * (`vitest.compiler.config.ts`). An app with `reactCompiler: true` compiles the
 * `ui` source that it imports, and the run compiles it the same way.
 *
 * The compiler reads the `ui` source only. The tests stay plain, and so do the
 * docs site and the dependencies in `node_modules`. So the plain run and the
 * compiled run differ only in the `ui` source.
 *
 * The preset is written out rather than taken from `reactCompilerPreset`. That
 * helper applies only to the client environment, and the `pure` project runs in
 * node.
 */
export function compileUiSource() {
	return babel({
		presets: [
			{
				preset: () => ({ plugins: [[reactCompiler, {}]] }),
				rolldown: {
					filter: {
						id: { exclude: [HARNESS, DOCS, /[\\/]node_modules[\\/]/] },
						// A module with no capitalized name and no `use` call holds no
						// component or hook, so Babel skips it.
						code: /\b[A-Z]|\buse/,
					},
				},
			},
		],
	})
}
