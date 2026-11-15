import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests of the rules of the game touch no DOM,
 * so the environment is node. A test of a hook sets the jsdom environment in
 * its file.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'node',
	},
})
