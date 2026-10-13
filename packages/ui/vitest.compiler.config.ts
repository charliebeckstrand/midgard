import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vitest/config'
import { splitSequencer } from './src/__tests__/setup/split-sequencer'
import { compileUiSource } from './vitest.compiler.preset'
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
// config over the `unit`, `pure`, `integration`, and `geometry` projects, and CI runs it in
// a job of its own. The `boundary` project reads source, not rendered output,
// so it stays out.
//
// The `skips` project runs the skip gate in src/__tests__/compiler/, which only
// this run needs.
//
// The compiler reads the `ui` source, not the tests (`vitest.compiler.preset.ts`).
export default mergeConfig(base, {
	plugins: [compileUiSource('__tests__')],
	test: {
		// `grid-compiler.test.ts` reads this to tell the two runs apart.
		env: { REACT_COMPILER: '1' },
		// The skip gate compiles each module of the source, and it held a large
		// part of the shard that ran it. So each shard runs the gate, and the gate
		// compiles the part of the modules for that shard.
		sequence: { sequencer: splitSequencer(['react-compiler-skips.test.ts']) },
		// Added to the projects of the base config.
		projects: [
			{
				extends: true as const,
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
					// The file compiles about 800 modules, which takes longer than the
					// default limit. Each shard compiles its part of them.
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
