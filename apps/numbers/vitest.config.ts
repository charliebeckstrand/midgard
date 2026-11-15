import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests of the rules of the game touch no DOM,
 * so the environment is node. A test of a hook sets the jsdom environment in
 * its file.
 *
 * The tsconfig of Next.js keeps JSX as it is, for Next.js to compile. A test
 * can import a component, so the transform compiles JSX here.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	test: {
		...sharedTest,
		environment: 'node',
	},
})
