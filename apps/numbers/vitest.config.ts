import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests cover the rules of the game, which
 * touch no DOM, so the environment is node.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'node',
	},
})
