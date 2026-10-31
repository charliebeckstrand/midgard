import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app.
 *
 * A test renders the chrome of the app, so the environment is jsdom. The
 * tsconfig of Next.js keeps JSX as it is, for Next.js to compile, so the
 * transform compiles JSX here. The setup file unmounts each render and
 * patches `Request` for a same-origin path.
 */
export default defineConfig({
	oxc: { jsx: { runtime: 'automatic' } },
	test: {
		...sharedTest,
		include: ['src/__tests__/**/*.test.{ts,tsx}'],
		environment: 'jsdom',
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
