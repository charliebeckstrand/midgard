import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import babel from '@rolldown/plugin-babel'
import reactCompiler from 'babel-plugin-react-compiler'
import { mergeConfig } from 'vitest/config'
import base from './vitest.config'

const { version } = createRequire(import.meta.url)('babel-plugin-react-compiler/package.json') as {
	version: string
}

// The React Compiler gate. It runs the `ui` tests with each module compiled, as
// an app with `reactCompiler: true` compiles the `ui` source it imports.
//
// The compiler caches a value on the identity of its inputs. A component that
// reads a mutable object during render, or a bare layout read that the compiler
// removes, passes the plain suite and fails here. `test:compiler` runs this
// config over the `unit`, `pure`, and `integration` projects, and CI runs it in
// a job of its own. The `boundary` project reads source, not rendered output,
// so it stays out.
//
// The `skips` project runs the skip ledger in src/__tests__/compiler/, which
// only this run needs.
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
					// A module with no capitalized name and no `use` call holds no component
					// or hook, so Babel skips it.
					rolldown: { filter: { code: /\b[A-Z]|\buse/ } },
				},
			],
		}),
	],
	test: {
		// `grid-compiler.test.ts` reads this to tell the two runs apart.
		env: { REACT_COMPILER: '1' },
		// Added to the projects of the base config.
		projects: [
			{
				extends: true as const,
				test: {
					name: 'skips',
					environment: 'node',
					pool: 'threads',
					include: ['src/__tests__/compiler/*.test.ts'],
					// The group of `unit`, so the one long file runs next to that project
					// and not after the last group. Measured warm on four cores, it adds
					// about 5 seconds here, and about 16 seconds as a last group.
					sequence: { groupOrder: 0 },
					// The file compiles about 800 modules, in about 20 seconds on four
					// cores.
					testTimeout: 120_000,
				},
			},
		],
		// A module cache of its own, apart from the plain run's, so a compiled
		// module never reaches the plain run. A warm cache halves this run. The
		// cache keys a file on its source, the plugin names, and the config, not
		// on the compiler's version, so the path carries that version. A
		// compiler upgrade then starts a cold cache, not a stale one.
		experimental: {
			fsModuleCache: true,
			fsModuleCachePath: fileURLToPath(
				new URL(
					`../../node_modules/.experimental-vitest-cache-compiler-${version}`,
					import.meta.url,
				),
			),
		},
	},
})
