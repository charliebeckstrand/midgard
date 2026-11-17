import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'

/**
 * The `ui` source, `src`. A file outside it is not `ui` source: for example a
 * config of the package, or the `vitest.shared.mts` of the repository root,
 * which a test imports through `vitest.base.ts`. Vite gives each module id
 * with forward slashes, on Windows too.
 */
const SOURCE_DIR = `${import.meta.dirname.replaceAll('\\', '/')}/src/`

const SOURCE = new RegExp(`^${SOURCE_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)

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
 * docs site, the files outside `src`, and the dependencies. So the plain run
 * and the compiled run differ only in the `ui` source.
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
						id: { include: SOURCE, exclude: [HARNESS, DOCS] },
						// A module with no capitalized name and no `use` call holds no
						// component or hook, so Babel skips it.
						code: /\b[A-Z]|\buse/,
					},
				},
			},
		],
	})
}
