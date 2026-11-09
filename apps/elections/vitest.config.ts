import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. Most tests cover the pure modules: the parser
 * of civicAPI, the registry, the URL codec, and the race math. None of them
 * touch a DOM, so the environment is node. A test of a hook or a component
 * opens with `// @vitest-environment jsdom`, and only that file runs in jsdom.
 *
 * The tsconfig of Next.js keeps JSX as it is, for Next.js to compile. A test
 * can import a component, so the transform compiles JSX here.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	test: {
		...sharedTest,
		environment: 'node',
		env: { TZ: 'UTC' },
	},
})
