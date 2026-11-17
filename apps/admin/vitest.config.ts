import { defineConfig } from 'vitest/config'
import { nextApp, sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app.
 *
 * A test renders the chrome of the app, so the environment is jsdom. The
 * setup file unmounts each render and patches `Request` for a same-origin
 * path.
 */
export default defineConfig({
	...nextApp,
	test: {
		...sharedTest,
		environment: 'jsdom',
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
