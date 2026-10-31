import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests cover the pure modules: the reader of
 * the scoreboard and the rules that grade a pick. None of them touch a DOM, so
 * the environment is node. The components compose `ui`, which has its own suite.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'node',
		env: { TZ: 'UTC' },
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
