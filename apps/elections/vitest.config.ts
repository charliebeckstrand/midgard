import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. Most tests cover the pure modules: the parser
 * of civicAPI, the registry, the URL codec, and the race math. None of them
 * touch a DOM, so the environment is node. A test of a hook or a component
 * opens with `// @vitest-environment jsdom`, and only that file runs in jsdom.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'node',
		// Sets the `asyncUtilTimeout` of the shared config on Testing Library.
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
