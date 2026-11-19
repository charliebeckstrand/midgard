import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app.
 *
 * A test renders the chrome of the app, so the environment is jsdom. The
 * setup file unmounts each render, patches `Request` for a same-origin path,
 * and sets the `asyncUtilTimeout` of the shared config on Testing Library.
 */
export default defineConfig({
	test: {
		...sharedTest,
		environment: 'jsdom',
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
