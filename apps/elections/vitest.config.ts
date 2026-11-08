import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests cover the pure modules: the parser of
 * civicAPI, the registry, the URL codec, and the race math. None of them touch
 * a DOM, so the environment is node.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'node',
		env: { TZ: 'UTC' },
	},
})
