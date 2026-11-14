import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests cover the pure modules: the reader of
 * the scoreboard and the rules that grade a pick. A test of a component renders
 * it to static markup. None of them touch a DOM, so the environment is node.
 * The components compose `ui`, which has its own suite.
 *
 * The tsconfig of Next.js keeps JSX as it is, for Next.js to compile, so the
 * transform compiles JSX here.
 *
 * A route handler of `app/api` imports by the `@/` paths of the tsconfig, so the
 * resolver reads them.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	resolve: { tsconfigPaths: true },
	test: {
		...sharedTest,
		environment: 'node',
		env: { TZ: 'UTC' },
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
