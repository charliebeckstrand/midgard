import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'
import { mergeConfig } from 'vitest/config'
import base from './vitest.config'

// The React Compiler gate. It runs the grid tests with each module compiled, as
// an app with `reactCompiler: true` compiles the `ui` source it imports.
//
// The compiler caches a value on the identity of its inputs. A grid that reads a
// mutable engine during render, or a bare layout read that the compiler removes,
// passes the plain suite and fails here. `test:compiler` runs this config, and
// CI runs it in the gate job.
//
// The preset is written out rather than taken from `reactCompilerPreset`. That
// helper applies only to the client environment, and the `pure` project runs in
// node.
export default mergeConfig(base, {
	plugins: [
		babel({
			presets: [
				{
					preset: () => ({ plugins: [[reactCompiler, {}]] }),
					// A module with no capitalised name and no `use` call holds no component
					// or hook, so Babel skips it.
					rolldown: { filter: { code: /\b[A-Z]|\buse/ } },
				},
			],
		}),
	],
	test: {
		// `grid-compiler.test.ts` reads this to tell the two runs apart.
		env: { REACT_COMPILER: '1' },
		// The module cache keys a file on its source, not on this transform. A
		// compiled module written to it would reach the plain run, so this run
		// neither reads nor writes it.
		experimental: { fsModuleCache: false },
	},
})
